/**
 * Edge cache for the Cloudflare Worker (wired up in /worker.ts).
 *
 * Why: the site runs on the Workers Free plan (10 ms CPU per request), and a
 * cold render loads the Next.js server and burns 400-1000 ms. Serving repeat
 * requests from the Workers Cache API answers them before the Next server is
 * ever loaded. The Cache API is free and needs no bindings.
 *
 * Invalidation: cache keys embed `bmwic_meta.data_version` (a counter a
 * Postgres trigger increments on ANY write to bmwic_entries — site actions,
 * scripts, or the Supabase dashboard) and the deployed Worker version. A change
 * to either means old keys are never looked up again; the next request per page
 * renders fresh and is cached. The Cache API is per data center, so "renders
 * once" means once per data center that serves the page.
 *
 * Global layer (ADR 0020): on a colo miss, deps.kv (src/lib/page-kv.ts) is
 * consulted before rendering, and renders are written to both. KV is optional
 * and fails open.
 *
 * Pure: no Next.js or Workers-runtime imports, so it is unit-testable in Node.
 */
import { isKvEligiblePath, pageKvKey, sha256Hex, type PageKv } from './page-kv';

/** Set by mutating server actions; requests carrying it skip the edge cache. */
export const FRESH_COOKIE = 'mc_fresh';
/** Longer than VERSION_TTL_MS so the writer outlasts every isolate's memo. */
export const FRESH_COOKIE_MAX_AGE_S = 60;
/** Safety net only (invalidation is version-driven); also refreshes the time-based "Trending" tile. */
export const EDGE_TTL_S = 86_400;
/** How long one Worker isolate trusts the data version before re-reading it. */
export const VERSION_TTL_MS = 10_000;

const KEY_ORIGIN = 'https://edge-cache.internal';
const BYPASS_PREFIXES = ['/edit', '/admin', '/api', '/_next'];
// `_rsc` is Next's client cache-buster; the rest are link-tracking tags that
// forum/social shares append and no page reads. Neither changes the output, so
// neither forces a bypass, and neither is part of the key.
const IGNORED_QUERY_PARAMS = new Set(['_rsc', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid']);
// Wall time, not CPU. Only a cold isolate with no last-known-good blocks on it (#23).
const VERSION_FETCH_TIMEOUT_MS = 4_000;
const STORABLE_STATUSES = new Set([200, 404]);
// Next.js varies RSC responses on these; HTML and flight data for one URL must never share a key.
const RSC_VARY_HEADERS = [
  'rsc',
  'next-router-state-tree',
  'next-router-prefetch',
  'next-router-segment-prefetch',
  'next-url',
];
const BROWSER_CACHE_CONTROL = 'private, no-cache, no-store, max-age=0, must-revalidate';

type CacheStatus = 'HIT' | 'HIT-KV' | 'MISS' | 'BYPASS';

export interface EdgeCacheStore {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, response: Response): Promise<void>;
}

export interface EdgeCacheDeps {
  cache: EdgeCacheStore;
  /** Identifies the deployed code, so a deploy never serves pages rendered by the previous one. */
  buildId: string;
  /** Current data version, or null when it cannot be determined (then the cache is bypassed). */
  getVersion: () => Promise<string | null>;
  /** The real app (OpenNext worker). */
  origin: (request: Request) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  /**
   * True once the app flagged a failed data read during this request's render
   * (see markRenderFailed). Checked only after the body has fully streamed,
   * because the status line is committed before the render finishes.
   */
  renderFailed?: () => boolean;
  /** Global page cache (free KV). Absent means colo cache only. */
  kv?: PageKv;
}

const RENDER_FAILED = Symbol.for('mcolors.edge-cache.render-failed');

/**
 * Called by the data layer when a read fails mid-render. Next commits a 200
 * (and RSC responses always say 200) before the page finishes, so the status
 * code cannot tell the cache a render degraded; this flag can. `ctx` is the
 * request's ExecutionContext as seen through getCloudflareContext().
 */
export function markRenderFailed(ctx: unknown): void {
  if (ctx && typeof ctx === 'object') {
    (ctx as Record<symbol, unknown>)[RENDER_FAILED] = true;
  }
}

/**
 * Wraps the Workers ExecutionContext handed to OpenNext so markRenderFailed
 * can be observed per request. Methods are bound to the real ctx (host
 * objects throw "illegal invocation" when called with a foreign `this`).
 */
export function renderFailureTracker<T extends object>(ctx: T): { ctx: T; failed: () => boolean } {
  let failed = false;
  const proxy = new Proxy(ctx, {
    get(target, prop) {
      if (prop === RENDER_FAILED) return failed;
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
      if (prop === RENDER_FAILED) {
        failed = value === true;
        return true;
      }
      return Reflect.set(target, prop, value, target);
    },
  });
  return { ctx: proxy, failed: () => failed };
}

function startsWithSegment(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function hasFreshCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').some((part) => part.trim().startsWith(`${FRESH_COOKIE}=`));
}

/** Any RSC router header or the `_rsc` cache-buster marks a client-navigation (flight data) request. */
function isRscRequest(request: Request): boolean {
  return RSC_VARY_HEADERS.some((name) => request.headers.has(name)) || new URL(request.url).searchParams.has('_rsc');
}

export function isCacheableRequest(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (request.headers.has('next-action')) return false;
  if (hasFreshCookie(request)) return false;

  const url = new URL(request.url);
  if (BYPASS_PREFIXES.some((prefix) => startsWithSegment(url.pathname, prefix))) return false;
  for (const name of url.searchParams.keys()) {
    if (!IGNORED_QUERY_PARAMS.has(name) && !name.startsWith('utm_')) return false;
  }
  return true;
}

export interface KeyVersion {
  build: string;
  data: string;
}

/**
 * Always a GET request (the Cache API only stores GETs), so HEAD shares GET's entry.
 * `_rsc` is deliberately left out: it is only a client-side cache-buster derived
 * from the router headers, which are hashed into the key already — keying on it
 * would let random `_rsc` values force a full render every time.
 */
export async function cacheKey(request: Request, version: KeyVersion): Promise<Request> {
  const url = new URL(request.url);
  const varyFingerprint = await sha256Hex(
    RSC_VARY_HEADERS.map((name) => `${name}:${request.headers.get(name) ?? ''}`).join('\n')
  );
  const keyUrl = new URL(
    `${KEY_ORIGIN}/${encodeURIComponent(url.host)}/${encodeURIComponent(version.build)}/${encodeURIComponent(version.data)}${url.pathname}`
  );
  keyUrl.searchParams.set('h', varyFingerprint);
  return new Request(keyUrl.toString(), { method: 'GET' });
}

function withStatus(response: Response, status: CacheStatus, cacheControl?: string): Response {
  const headers = new Headers(response.headers);
  headers.set('x-edge-cache', status);
  if (cacheControl) headers.set('cache-control', cacheControl);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isStorable(request: Request, response: Response): boolean {
  return (
    request.method === 'GET' &&
    STORABLE_STATUSES.has(response.status) &&
    !response.headers.has('set-cookie') &&
    response.body !== null
  );
}

/** The copy that goes into the edge cache: cacheable by Cloudflare, Vary handled by the key. */
function toStoredResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('cache-control', `public, max-age=0, s-maxage=${EDGE_TTL_S}`);
  headers.delete('vary');
  headers.delete('x-edge-cache');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function handleWithEdgeCache(request: Request, deps: EdgeCacheDeps): Promise<Response> {
  if (!isCacheableRequest(request)) {
    return withStatus(await deps.origin(request), 'BYPASS');
  }

  const data = await deps.getVersion();
  if (data === null) {
    return withStatus(await deps.origin(request), 'BYPASS');
  }

  const key = await cacheKey(request, { build: deps.buildId, data });
  const hit = await deps.cache.match(key);
  if (hit) {
    const served = request.method === 'HEAD' ? new Response(null, hit) : hit;
    // Browsers must not hold the page past the next edit; only the edge caches it.
    return withStatus(served, 'HIT', BROWSER_CACHE_CONTROL);
  }

  // KV is for full HTML pages only. RSC keys hash the router-state header, which varies with the
  // page the visitor came from: many distinct keys (KV writes) that rarely hit globally (ADR 0020).
  const kvKey =
    deps.kv && !isRscRequest(request) && isKvEligiblePath(new URL(request.url).pathname)
      ? await pageKvKey(key, { build: deps.buildId, data })
      : null;
  if (deps.kv && kvKey) {
    const fromKv = await deps.kv.read(kvKey);
    if (fromKv) {
      const stored = () => new Response(fromKv.body, { status: fromKv.status, headers: fromKv.headers });
      // Next time this colo answers locally.
      deps.waitUntil(deps.cache.put(key, toStoredResponse(stored())).catch(() => undefined));
      const served = request.method === 'HEAD' ? new Response(null, stored()) : stored();
      return withStatus(served, 'HIT-KV', BROWSER_CACHE_CONTROL);
    }
  }

  // A HEAD miss renders as GET so the result can be stored; otherwise uptime
  // monitors (HEAD every few minutes) re-render the page forever (#22).
  const isHead = request.method === 'HEAD';
  const renderRequest = isHead ? new Request(request, { method: 'GET' }) : request;
  const response = await deps.origin(renderRequest);
  if (isStorable(renderRequest, response)) {
    deps.waitUntil(storeWhenComplete(key, kvKey, response.clone(), deps));
  }
  return withStatus(isHead ? new Response(null, response) : response, 'MISS');
}

export interface VersionFallback {
  get(): Promise<string | null>;
  set(version: string): Promise<void>;
}

/** Buffers the full body first, so a failure flagged late in the render still blocks the store. */
async function storeWhenComplete(
  key: Request,
  kvKey: string | null,
  copy: Response,
  deps: EdgeCacheDeps
): Promise<void> {
  const body = await copy.arrayBuffer();
  if (deps.renderFailed?.()) return;
  const complete = new Response(body, { status: copy.status, statusText: copy.statusText, headers: copy.headers });
  const stored = toStoredResponse(complete);
  // The KV write never throws; only 200s are written (page-kv.ts).
  const kvWrite = deps.kv && kvKey ? deps.kv.write(kvKey, stored.status, stored.headers, body) : Promise.resolve();
  await Promise.all([deps.cache.put(key, stored), kvWrite]);
}

/**
 * Wraps a version reader with a per-isolate memo. A successful read is also
 * saved as last-known-good, so if Supabase is unreachable the cached pages keep
 * serving (a live render would need Supabase anyway). With no fallback
 * either, the caller gets null and bypasses (not memoized, so the next request
 * retries).
 *
 * The read blocks deliberately: waiting costs wall time, not CPU, and answering
 * with an older version would serve pre-edit pages to everyone.
 *
 * Concurrent requests do NOT share an in-flight read. They did (#23), but Workers
 * drops a promise created by one request when another request awaits it after the
 * first has ended (compatibility flag handle_cross_request_promise_resolution), so a
 * cancelled prefetch that started the read 500'd every request waiting on it
 * (production, 2026-11-14). A stale memo now costs one small read per concurrent
 * request; within the TTL the memo serves everything.
 */
export function createVersionSource(
  read: () => Promise<string>,
  fallback: VersionFallback,
  options: { ttlMs?: number; now?: () => number } = {}
): () => Promise<string | null> {
  const ttlMs = options.ttlMs ?? VERSION_TTL_MS;
  const now = options.now ?? Date.now;
  let memo: { value: string; at: number } | null = null;

  async function readOrFallBack(): Promise<string | null> {
    try {
      const value = await read();
      const changed = memo?.value !== value;
      memo = { value, at: now() };
      // A failed save must never turn a fresh read into the older fallback.
      if (changed) {
        await fallback.set(value).catch((error) => {
          console.error('edge-cache: could not save last-known-good version', error);
        });
      }
      return value;
    } catch (error) {
      console.error('edge-cache: data version unavailable', error);
      const lastKnown = await fallback.get().catch(() => null);
      // Memoize the fallback too, so a sustained outage costs one failed read
      // per isolate per TTL instead of one per request.
      if (lastKnown !== null) memo = { value: lastKnown, at: now() };
      return lastKnown;
    }
  }

  return () => {
    if (memo && now() - memo.at < ttlMs) return Promise.resolve(memo.value);
    return readOrFallBack();
  };
}

/** Last-known-good data version, kept in the same per-colo Cache API. */
export function cacheVersionFallback(cache: EdgeCacheStore): VersionFallback {
  const key = () => new Request(`${KEY_ORIGIN}/__data_version`, { method: 'GET' });
  return {
    async get() {
      const hit = await cache.match(key());
      return hit ? hit.text() : null;
    },
    async set(version) {
      await cache.put(
        key(),
        new Response(version, { headers: { 'cache-control': `public, s-maxage=${EDGE_TTL_S}` } })
      );
    },
  };
}

/** Reads bmwic_meta.data_version through PostgREST with the public anon key. */
export async function fetchDataVersion(supabaseUrl: string, anonKey: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/rest/v1/bmwic_meta?select=data_version&id=eq.1`, {
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
    signal: AbortSignal.timeout(VERSION_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`bmwic_meta HTTP ${res.status}`);
  const rows = (await res.json()) as unknown;
  // bigint arrives as a JSON number (or a string if it ever exceeds 2^53).
  const raw: unknown = Array.isArray(rows) && rows.length === 1 ? rows[0]?.data_version : undefined;
  if (typeof raw !== 'number' && typeof raw !== 'string') {
    throw new Error('bmwic_meta returned no data_version row');
  }
  return String(raw);
}
