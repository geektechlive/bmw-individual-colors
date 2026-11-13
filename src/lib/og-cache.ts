/**
 * Global cache for color-page social cards (/colors/<slug>/opengraph-image),
 * wired up in /worker.ts ahead of the per-colo page cache (#24).
 *
 * Why: each card render loads the Next server plus the image renderer, about
 * 1.3-2 s of CPU on a 10 ms plan; both requests Cloudflare killed in the week
 * of 2026-11-06 were cards. Cards are requested rarely and from many data
 * centers, so the per-colo Cache API almost never has them. Free-tier Workers
 * KV is global: a card renders again only after a data change or a deploy.
 * KV is eventually consistent (~60 s), so concurrent first requests in
 * different regions can still each render; that is acceptable at this volume.
 *
 * Pure: no Workers-runtime imports, so it is unit-testable in Node.
 *
 * `origin` should be the edge-cache handler (see worker.ts), so non-PNG
 * results such as 404s for unknown slugs are cached per colo like any page.
 */
import { hasFreshCookie } from './edge-cache';

/** The subset of a Workers KV namespace this module uses. */
export interface OgStore {
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  put(key: string, value: ArrayBuffer, options?: { expirationTtl?: number }): Promise<void>;
}

export interface OgCacheDeps {
  /** Undefined when the binding is not configured; the handler then steps aside. */
  store: OgStore | undefined;
  buildId: string;
  getVersion: () => Promise<string | null>;
  origin: (request: Request) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  renderFailed?: () => boolean;
}

/** Safety net only; keys change with every data version and deploy. */
export const OG_KV_TTL_S = 30 * 86_400;
/** Crawlers and chat apps may hold a card this long; counts can lag by that much. */
const OG_BROWSER_CACHE_CONTROL = 'public, max-age=3600';
const OG_PATH = /^\/colors\/([a-z0-9-]+)\/opengraph-image$/;

/** The color slug when `pathname` is a color OG image, else null. */
export function ogSlug(pathname: string): string | null {
  return OG_PATH.exec(pathname)?.[1] ?? null;
}

function ogKey(buildId: string, slug: string, version: string): string {
  return `og:${buildId}:${slug}:${version}`;
}

function pngResponse(body: ArrayBuffer | null, status: 'HIT' | 'MISS', cacheControl = OG_BROWSER_CACHE_CONTROL): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'image/png', 'cache-control': cacheControl, 'x-og-cache': status },
  });
}

/**
 * Answers a color OG image from KV or renders and stores it. Returns null for
 * anything it does not handle (not an OG path, not GET/HEAD, no binding, no
 * data version), so the caller falls through to the normal page path.
 */
export async function handleOgImage(request: Request, deps: OgCacheDeps): Promise<Response | null> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const slug = ogSlug(new URL(request.url).pathname);
  if (slug === null || !deps.store) return null;
  // The editor sees their own change, exactly like the page cache (mc_fresh).
  if (hasFreshCookie(request)) return deps.origin(request);
  const version = await deps.getVersion();
  if (version === null) return null;

  const isHead = request.method === 'HEAD';
  const key = ogKey(deps.buildId, slug, version);
  const cached = await deps.store.get(key, 'arrayBuffer').catch((error) => {
    console.error('og-cache: KV read failed', error);
    return null;
  });
  if (cached) return pngResponse(isHead ? null : cached, 'HIT');

  // Query strings are dropped so they cannot force renders; HEAD renders as GET.
  const url = new URL(request.url);
  url.search = '';
  const rendered = await deps.origin(new Request(url.toString(), { method: 'GET', headers: request.headers }));
  const isPng = rendered.status === 200 && (rendered.headers.get('content-type') ?? '').startsWith('image/png');
  if (!isPng) return rendered;

  const body = await rendered.arrayBuffer();
  // A render whose data read failed may show a wrong count: serve it, but let
  // nobody (KV, crawlers, chat apps) keep it.
  if (deps.renderFailed?.()) return pngResponse(isHead ? null : body, 'MISS', 'no-store');
  deps.waitUntil(
    deps.store.put(key, body, { expirationTtl: OG_KV_TTL_S }).catch((error) => {
      console.error('og-cache: KV write failed', error);
    })
  );
  return pngResponse(isHead ? null : body, 'MISS');
}
