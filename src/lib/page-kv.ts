/**
 * Global page cache in free-tier Workers KV, behind the per-colo Cache API
 * (ADR 0020, issue #21). Lookup order is caches.default, then KV, then render.
 *
 * Why: the Cache API is per data center and traffic spreads over ~45, so about
 * a third of page requests and over half of RSC requests missed and loaded the
 * Next server (~450-490 ms CPU on a 10 ms plan). KV is global, so a page
 * rendered anywhere is found everywhere (after KV's ~60 s propagation).
 *
 * Everything here FAILS OPEN: a slow, failing or full KV can only make a
 * request render as it would without this layer. Never throws.
 *
 * Pure: no Workers-runtime imports, so it is unit-testable in Node.
 */

/** The subset of a Workers KV namespace this module uses (same shape as og-cache's). */
export interface PageKvStore {
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  put(key: string, value: ArrayBuffer, options?: { expirationTtl?: number }): Promise<void>;
}

/** Safety net only: keys carry the deploy id and data_version, so they go stale on their own. */
export const PAGE_KV_TTL_S = 7 * 86_400;
/**
 * Wall-clock budget for one KV read. A miss that renders costs 1.6-2.6 s wall, so
 * a slow KV read must not add much to that; a healthy read (even uncached in the
 * colo) is far below this. Past it we give up and render.
 */
export const PAGE_KV_READ_TIMEOUT_MS = 400;
/** Well under KV's 25 MiB value limit; real pages and RSC payloads are ~100 KB. */
export const PAGE_KV_MAX_BYTES = 2 * 1024 * 1024;
/** After a failed write (usually the daily quota) this isolate stops trying for this long. */
export const PAGE_KV_WRITE_BACKOFF_MS = 5 * 60_000;

const KEY_PREFIX = 'page';
const HEADER_LENGTH_BYTES = 4;
// Never persisted: cookies must not be shared, the rest describe the wire encoding or are rebuilt on read.
const UNSTORED_HEADERS = ['set-cookie', 'content-length', 'transfer-encoding', 'vary', 'x-edge-cache'];

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Social cards have their own og: keys (src/lib/og-cache.ts); never double-store them here. */
export function isKvEligiblePath(pathname: string): boolean {
  return !pathname.endsWith('/opengraph-image');
}

/**
 * `page:<deploy id>:<data_version>:<sha256 of the edge-cache key URL>`. Build and
 * data version stay readable; the hash covers host, path and the hashed RSC
 * router headers, and keeps the key under KV's 512-byte limit for any path.
 */
export async function pageKvKey(edgeKey: Request, version: { build: string; data: string }): Promise<string> {
  return `${KEY_PREFIX}:${version.build}:${version.data}:${await sha256Hex(edgeKey.url)}`;
}

/** Value layout: 4-byte big-endian header length, JSON `{s, h}`, then the body bytes. */
export function encodePage(status: number, headers: Headers, body: ArrayBuffer): ArrayBuffer | null {
  if (headers.has('set-cookie') || headers.has('content-encoding')) return null;
  if (body.byteLength > PAGE_KV_MAX_BYTES) return null;
  const kept: [string, string][] = [];
  headers.forEach((value, name) => {
    if (!UNSTORED_HEADERS.includes(name)) kept.push([name, value]);
  });
  const head = new TextEncoder().encode(JSON.stringify({ s: status, h: kept }));
  const out = new Uint8Array(HEADER_LENGTH_BYTES + head.byteLength + body.byteLength);
  new DataView(out.buffer).setUint32(0, head.byteLength);
  out.set(head, HEADER_LENGTH_BYTES);
  out.set(new Uint8Array(body), HEADER_LENGTH_BYTES + head.byteLength);
  return out.buffer;
}

export interface DecodedPage {
  status: number;
  headers: [string, string][];
  body: ArrayBuffer;
}

/** Null for anything that is not a value encodePage wrote (treated as a miss). */
export function decodePage(buffer: ArrayBuffer): DecodedPage | null {
  try {
    if (buffer.byteLength < HEADER_LENGTH_BYTES) return null;
    const headLength = new DataView(buffer).getUint32(0);
    const bodyStart = HEADER_LENGTH_BYTES + headLength;
    if (bodyStart > buffer.byteLength) return null;
    const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, HEADER_LENGTH_BYTES, headLength))) as {
      s?: unknown;
      h?: unknown;
    };
    if (typeof head.s !== 'number' || !Array.isArray(head.h)) return null;
    const headers = head.h.filter(
      (pair): pair is [string, string] =>
        Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string'
    );
    return { status: head.s, headers, body: buffer.slice(bodyStart) };
  } catch {
    return null;
  }
}

export interface PageKv {
  /** The stored page, or null on miss, timeout, error or corrupt value. Never throws. */
  read(key: string): Promise<DecodedPage | null>;
  /** Best effort. Never throws, never blocks on a quota failure beyond one attempt per backoff window. */
  write(key: string, status: number, headers: Headers, body: ArrayBuffer): Promise<void>;
}

export interface PageKvOptions {
  readTimeoutMs?: number;
  writeBackoffMs?: number;
  now?: () => number;
}

/** Create once per isolate: the write backoff state lives in the closure. */
export function createPageKv(store: PageKvStore, options: PageKvOptions = {}): PageKv {
  const readTimeoutMs = options.readTimeoutMs ?? PAGE_KV_READ_TIMEOUT_MS;
  const backoffMs = options.writeBackoffMs ?? PAGE_KV_WRITE_BACKOFF_MS;
  const now = options.now ?? Date.now;
  let writesPausedUntil = 0;

  return {
    async read(key) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), readTimeoutMs);
        });
        const read = store.get(key, 'arrayBuffer').catch((error) => {
          console.error('page-kv: read failed', error);
          return null;
        });
        const raw = await Promise.race([read, timeout]);
        return raw ? decodePage(raw) : null;
      } catch (error) {
        console.error('page-kv: read failed', error);
        return null;
      } finally {
        clearTimeout(timer);
      }
    },

    async write(key, status, headers, body) {
      if (status !== 200 || now() < writesPausedUntil) return;
      const value = encodePage(status, headers, body);
      if (!value) return;
      try {
        await store.put(key, value, { expirationTtl: PAGE_KV_TTL_S });
      } catch (error) {
        writesPausedUntil = now() + backoffMs;
        console.error('page-kv: write failed, pausing writes in this isolate', error);
      }
    },
  };
}
