import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheKey,
  createVersionSource,
  handleWithEdgeCache,
  isCacheableRequest,
  type EdgeCacheDeps,
} from '../../src/lib/edge-cache';
import { isBlockedPath } from '../../src/lib/blocked-paths';

const SITE = 'https://mcolors.geektechlive.com';
const V1 = { build: 'b1', data: '1' };

function req(path: string, init: RequestInit = {}): Request {
  return new Request(`${SITE}${path}`, init);
}

/** In-memory stand-in for the Workers Cache API, keyed by URL like the real one. */
function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    async match(key: Request) {
      const hit = store.get(key.url);
      return hit ? hit.clone() : undefined;
    },
    async put(key: Request, res: Response) {
      store.set(key.url, res);
    },
  };
}

function harness(opts: { version?: string | null; origin?: (r: Request) => Response } = {}) {
  const cache = memoryCache();
  const pending: Promise<unknown>[] = [];
  let originCalls = 0;
  const deps: EdgeCacheDeps = {
    cache,
    buildId: 'b1',
    getVersion: async () => (opts.version === undefined ? '1' : opts.version),
    origin: async (r) => {
      originCalls += 1;
      return opts.origin
        ? opts.origin(r)
        : new Response(`page ${new URL(r.url).pathname}`, {
            status: 200,
            headers: { 'content-type': 'text/html', 'cache-control': 'private, no-cache, no-store' },
          });
    },
    waitUntil: (p) => {
      pending.push(p);
    },
  };
  return {
    deps,
    cache,
    get originCalls() {
      return originCalls;
    },
    settle: () => Promise.all(pending),
  };
}

// ---- isCacheableRequest -----------------------------------------------------

test('public GET pages are cacheable', () => {
  for (const p of ['/', '/reports', '/colors', '/colors/frozen-deep-grey', '/entries', '/map', '/submit']) {
    assert.equal(isCacheableRequest(req(p)), true, p);
  }
});

test('RSC navigation requests (only _rsc in the query) are cacheable', () => {
  assert.equal(isCacheableRequest(req('/reports?_rsc=abc12', { headers: { rsc: '1' } })), true);
});

test('token-bearing and private routes are never cacheable', () => {
  assert.equal(isCacheableRequest(req('/edit/123?token=abc&exp=1')), false);
  assert.equal(isCacheableRequest(req('/edit/123')), false);
  assert.equal(isCacheableRequest(req('/admin?token=abc')), false);
  assert.equal(isCacheableRequest(req('/admin')), false);
  assert.equal(isCacheableRequest(req('/api/anything')), false);
});

test('a path that merely starts with a bypass word is still cacheable', () => {
  assert.equal(isCacheableRequest(req('/editorial')), true);
});

test('any query parameter other than _rsc bypasses the cache', () => {
  assert.equal(isCacheableRequest(req('/entries?submitted=1')), false);
  assert.equal(isCacheableRequest(req('/reports?_rsc=x&token=y')), false);
});

test('non-GET/HEAD requests and server actions bypass the cache', () => {
  assert.equal(isCacheableRequest(req('/submit', { method: 'POST' })), false);
  assert.equal(isCacheableRequest(req('/submit', { headers: { 'next-action': 'abc' } })), false);
  assert.equal(isCacheableRequest(req('/', { method: 'HEAD' })), true);
});

test('the writer-bypass cookie skips the cache', () => {
  assert.equal(isCacheableRequest(req('/', { headers: { cookie: 'a=1; mc_fresh=1' } })), false);
  assert.equal(isCacheableRequest(req('/', { headers: { cookie: 'not_mc_fresh=1' } })), true);
});

test('tracking parameters from shared links do not bypass the cache', () => {
  assert.equal(isCacheableRequest(req('/colors/x?utm_source=forum&utm_medium=post')), true);
  assert.equal(isCacheableRequest(req('/?fbclid=abc')), true);
  assert.equal(isCacheableRequest(req('/?gclid=abc&_rsc=1')), true);
  assert.equal(isCacheableRequest(req('/?fbclid=abc&token=t')), false);
});

// ---- cacheKey ---------------------------------------------------------------

test('HTML and RSC requests for the same URL get different keys', async () => {
  const html = await cacheKey(req('/reports'), V1);
  const rsc = await cacheKey(req('/reports', { headers: { rsc: '1' } }), V1);
  assert.notEqual(html.url, rsc.url);
});

test('prefetch and router-state headers are part of the key', async () => {
  const a = await cacheKey(req('/x?_rsc=1', { headers: { rsc: '1', 'next-router-prefetch': '1' } }), V1);
  const b = await cacheKey(req('/x?_rsc=1', { headers: { rsc: '1', 'next-router-state-tree': 'tree' } }), V1);
  const c = await cacheKey(req('/x?_rsc=1', { headers: { rsc: '1' } }), V1);
  assert.equal(new Set([a.url, b.url, c.url]).size, 3);
});

test('a new data version produces a new key', async () => {
  const a = await cacheKey(req('/'), { build: 'b1', data: '41' });
  const b = await cacheKey(req('/'), { build: 'b1', data: '42' });
  assert.notEqual(a.url, b.url);
});

test('tracking parameters are not part of the key', async () => {
  const plain = await cacheKey(req('/colors/x'), V1);
  const tracked = await cacheKey(req('/colors/x?utm_source=forum&fbclid=zz'), V1);
  assert.equal(plain.url, tracked.url);
});

test('a new deploy (build id) produces a new key', async () => {
  const a = await cacheKey(req('/'), { build: 'b1', data: '1' });
  const b = await cacheKey(req('/'), { build: 'b2', data: '1' });
  assert.notEqual(a.url, b.url);
});

test('the random _rsc cache-buster is not part of the key (its inputs already are)', async () => {
  const a = await cacheKey(req('/x?_rsc=aaa', { headers: { rsc: '1' } }), V1);
  const b = await cacheKey(req('/x?_rsc=bbb', { headers: { rsc: '1' } }), V1);
  assert.equal(a.url, b.url);
});

test('different hostnames never share a key', async () => {
  const a = await cacheKey(new Request('https://mcolors.geektechlive.com/'), V1);
  const b = await cacheKey(new Request('https://bmw-individual-colors.example.workers.dev/'), V1);
  assert.notEqual(a.url, b.url);
});

test('HEAD and GET share a key', async () => {
  const get = await cacheKey(req('/'), V1);
  const head = await cacheKey(req('/', { method: 'HEAD' }), V1);
  assert.equal(get.url, head.url);
  assert.equal(head.method, 'GET');
});

// ---- handleWithEdgeCache ----------------------------------------------------

test('first request renders (MISS) and stores; second is served from cache (HIT)', async () => {
  const h = harness();
  const first = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(first.headers.get('x-edge-cache'), 'MISS');
  assert.equal(await first.text(), 'page /reports');
  await h.settle();

  const second = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(second.headers.get('x-edge-cache'), 'HIT');
  assert.equal(await second.text(), 'page /reports');
  assert.equal(h.originCalls, 1);
});

test('the stored copy is edge-cacheable but what browsers get stays no-store', async () => {
  const h = harness();
  const miss = await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  const [stored] = [...h.cache.store.values()];
  assert.match(stored.headers.get('cache-control') ?? '', /s-maxage=86400/);
  assert.match(miss.headers.get('cache-control') ?? '', /no-store/);

  const hit = await handleWithEdgeCache(req('/'), h.deps);
  assert.match(hit.headers.get('cache-control') ?? '', /no-store/);
});

test('a bumped data version is a MISS', async () => {
  let version = '1';
  const h = harness();
  h.deps.getVersion = async () => version;
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  version = '2';
  const res = await handleWithEdgeCache(req('/'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'MISS');
  assert.equal(h.originCalls, 2);
});

test('if the data version cannot be read, serve live and store nothing', async () => {
  const h = harness({ version: null });
  const res = await handleWithEdgeCache(req('/'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'BYPASS');
  await h.settle();
  assert.equal(h.cache.store.size, 0);
});

test('responses with Set-Cookie are never stored', async () => {
  const h = harness({
    origin: () => new Response('x', { status: 200, headers: { 'set-cookie': 'a=1' } }),
  });
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  assert.equal(h.cache.store.size, 0);
});

test('errors are never stored; 404s are', async () => {
  const err = harness({ origin: () => new Response('boom', { status: 500 }) });
  await handleWithEdgeCache(req('/'), err.deps);
  await err.settle();
  assert.equal(err.cache.store.size, 0);

  const nf = harness({ origin: () => new Response('nope', { status: 404 }) });
  await handleWithEdgeCache(req('/colors/not-a-color'), nf.deps);
  await nf.settle();
  assert.equal(nf.cache.store.size, 1);
});

test('bypassed requests go straight to origin and are not stored', async () => {
  const h = harness();
  const res = await handleWithEdgeCache(req('/edit/1?token=t'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'BYPASS');
  await h.settle();
  assert.equal(h.cache.store.size, 0);
});

test('HEAD is answered from a GET-populated cache entry without a body', async () => {
  const h = harness();
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  const head = await handleWithEdgeCache(req('/', { method: 'HEAD' }), h.deps);
  assert.equal(head.headers.get('x-edge-cache'), 'HIT');
  assert.equal(head.body, null);
  assert.equal(h.originCalls, 1);
});

test('a HEAD miss is not stored (its response has no body)', async () => {
  const h = harness();
  await handleWithEdgeCache(req('/', { method: 'HEAD' }), h.deps);
  await h.settle();
  assert.equal(h.cache.store.size, 0);
});

// ---- createVersionSource ----------------------------------------------------

function lkgStore() {
  let saved: string | null = null;
  return {
    get: async () => saved,
    set: async (v: string) => {
      saved = v;
    },
    peek: () => saved,
  };
}

test('the data version is memoized for the TTL, then re-read', async () => {
  let now = 0;
  let reads = 0;
  const source = createVersionSource(async () => `${++reads}`, lkgStore(), { ttlMs: 10_000, now: () => now });
  assert.equal(await source(), '1');
  now = 9_999;
  assert.equal(await source(), '1');
  now = 10_000;
  assert.equal(await source(), '2');
});

test('a successful read is saved as last-known-good', async () => {
  const lkg = lkgStore();
  const source = createVersionSource(async () => '7', lkg, { now: () => 0 });
  await source();
  assert.equal(lkg.peek(), '7');
});

test('when the read fails, the last-known-good version keeps cache hits working', async () => {
  const lkg = lkgStore();
  await lkg.set('5');
  const source = createVersionSource(
    async () => {
      throw new Error('supabase down');
    },
    lkg,
    { now: () => 0 }
  );
  assert.equal(await source(), '5');
});

test('with no read and no last-known-good, the version is null (bypass) and not memoized', async () => {
  let fail = true;
  const source = createVersionSource(
    async () => {
      if (fail) throw new Error('supabase down');
      return '1';
    },
    lkgStore(),
    { ttlMs: 10_000, now: () => 0 }
  );
  assert.equal(await source(), null);
  fail = false;
  assert.equal(await source(), '1');
});

test('during an outage the fallback version is memoized, not re-fetched per request', async () => {
  const lkg = lkgStore();
  await lkg.set('5');
  let reads = 0;
  let now = 0;
  const source = createVersionSource(
    async () => {
      reads += 1;
      throw new Error('supabase down');
    },
    lkg,
    { ttlMs: 10_000, now: () => now }
  );
  assert.equal(await source(), '5');
  now = 5_000;
  assert.equal(await source(), '5');
  assert.equal(reads, 1);
  now = 10_000;
  await source();
  assert.equal(reads, 2);
});

// ---- isBlockedPath ----------------------------------------------------------

test('bot probes for dotfiles anywhere in the path are blocked', () => {
  for (const p of ['/.env', '/app/.env', '/shop/.env', '/cms/.git/config', '/.npmrc', '/wp-admin/css/x', '/wp-content/plugins/y', '/x.php']) {
    assert.equal(isBlockedPath(p), true, p);
  }
});

test('real pages and .well-known are not blocked', () => {
  for (const p of ['/', '/reports', '/colors/frozen-deep-grey', '/.well-known/security.txt', '/robots.txt', '/sitemap.xml']) {
    assert.equal(isBlockedPath(p), false, p);
  }
});
