import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleWithEdgeCache, type EdgeCacheDeps } from '../../src/lib/edge-cache';
import {
  createPageKv,
  decodePage,
  encodePage,
  PAGE_KV_MAX_BYTES,
  PAGE_KV_TTL_S,
  type PageKvStore,
} from '../../src/lib/page-kv';
import { requestLogLine } from '../../src/lib/request-log';

const SITE = 'https://mcolors.geektechlive.com';

function req(path: string, init: RequestInit = {}): Request {
  return new Request(`${SITE}${path}`, init);
}

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

interface KvOptions {
  get?: (key: string) => Promise<ArrayBuffer | null>;
  put?: (key: string, value: ArrayBuffer) => Promise<void>;
}

function memoryKv(options: KvOptions = {}) {
  const store = new Map<string, { value: ArrayBuffer; ttl?: number }>();
  let reads = 0;
  let writes = 0;
  const kv: PageKvStore = {
    async get(key) {
      reads += 1;
      return options.get ? options.get(key) : (store.get(key)?.value ?? null);
    },
    async put(key, value, opts) {
      writes += 1;
      if (options.put) return options.put(key, value);
      store.set(key, { value, ttl: opts?.expirationTtl });
    },
  };
  return {
    kv,
    store,
    get reads() {
      return reads;
    },
    get writes() {
      return writes;
    },
  };
}

function harness(
  opts: {
    kv?: KvOptions;
    noKv?: boolean;
    origin?: (r: Request) => Response;
    failed?: boolean;
    readTimeoutMs?: number;
    version?: string;
  } = {}
) {
  const cache = memoryCache();
  const kvh = memoryKv(opts.kv);
  const pending: Promise<unknown>[] = [];
  let originCalls = 0;
  let version = opts.version ?? '1';
  const deps: EdgeCacheDeps = {
    cache,
    buildId: 'b1',
    getVersion: async () => version,
    origin: async (r) => {
      originCalls += 1;
      return opts.origin
        ? opts.origin(r)
        : new Response(`page ${new URL(r.url).pathname}`, {
            status: 200,
            headers: { 'content-type': 'text/html', 'cache-control': 'private, no-cache, no-store', vary: 'rsc' },
          });
    },
    waitUntil: (p) => void pending.push(p),
    renderFailed: () => opts.failed === true,
    kv: opts.noKv ? undefined : createPageKv(kvh.kv, { readTimeoutMs: opts.readTimeoutMs ?? 30 }),
  };
  return {
    deps,
    cache,
    kvh,
    setVersion: (v: string) => {
      version = v;
    },
    get originCalls() {
      return originCalls;
    },
    settle: () => Promise.all(pending),
  };
}

test('a render is stored in both the colo cache and KV, with a TTL and a key carrying build and data version', async () => {
  const h = harness();
  const res = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'MISS');
  await h.settle();
  assert.equal(h.cache.store.size, 1);
  assert.equal(h.kvh.store.size, 1);
  const [[key, entry]] = [...h.kvh.store.entries()];
  assert.ok(key.startsWith('page:b1:1:'), key);
  assert.ok(key.length < 200);
  assert.equal(entry.ttl, PAGE_KV_TTL_S);
  assert.equal(PAGE_KV_TTL_S, 7 * 86_400);
});

test('a KV hit is served as HIT-KV without rendering and populates the colo cache', async () => {
  const first = harness();
  await handleWithEdgeCache(req('/reports'), first.deps);
  await first.settle();

  // A different colo: empty local cache, same global KV.
  const second = harness();
  for (const [k, v] of first.kvh.store) second.kvh.store.set(k, v);
  const res = await handleWithEdgeCache(req('/reports'), second.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'HIT-KV');
  assert.equal(await res.text(), 'page /reports');
  assert.equal(res.headers.get('content-type'), 'text/html');
  assert.match(res.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(second.originCalls, 0);
  await second.settle();
  assert.equal(second.cache.store.size, 1);

  const local = await handleWithEdgeCache(req('/reports'), second.deps);
  assert.equal(local.headers.get('x-edge-cache'), 'HIT');
  assert.equal(second.kvh.reads, 1);
});

test('a local colo HIT never reads KV', async () => {
  const h = harness();
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  const readsBefore = h.kvh.reads;
  const res = await handleWithEdgeCache(req('/'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'HIT');
  assert.equal(h.kvh.reads, readsBefore);
});

test('HEAD on a KV hit gets no body', async () => {
  const first = harness();
  await handleWithEdgeCache(req('/reports'), first.deps);
  await first.settle();
  const second = harness();
  for (const [k, v] of first.kvh.store) second.kvh.store.set(k, v);
  const res = await handleWithEdgeCache(req('/reports', { method: 'HEAD' }), second.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'HIT-KV');
  assert.equal(await res.text(), '');
});

test('RSC requests neither read nor write KV (pages only); they keep the colo cache', async () => {
  const variants: RequestInit[] = [
    { headers: { rsc: '1' } },
    { headers: { 'next-router-prefetch': '1' } },
    { headers: { 'next-router-state-tree': '%5B%5D' } },
    { headers: { 'next-router-segment-prefetch': '/_tree' } },
    { headers: { 'next-url': '/' } },
  ];
  for (const init of variants) {
    const h = harness();
    const res = await handleWithEdgeCache(req('/reports', init), h.deps);
    assert.equal(res.headers.get('x-edge-cache'), 'MISS');
    await h.settle();
    assert.equal(h.kvh.reads, 0, JSON.stringify(init));
    assert.equal(h.kvh.writes, 0, JSON.stringify(init));
    assert.equal(h.cache.store.size, 1);
  }
  const h = harness();
  await handleWithEdgeCache(req('/reports?_rsc=abc'), h.deps);
  await h.settle();
  assert.equal(h.kvh.reads + h.kvh.writes, 0);
  assert.equal(h.cache.store.size, 1);
});

test('a new data version or a new deploy never reads the old KV entry', async () => {
  const h = harness();
  await handleWithEdgeCache(req('/reports'), h.deps);
  await h.settle();
  h.setVersion('2');
  const res = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'MISS');
  assert.equal(h.originCalls, 2);
  await h.settle();
  const keys = [...h.kvh.store.keys()];
  assert.ok(keys.some((k) => k.startsWith('page:b1:1:')));
  assert.ok(keys.some((k) => k.startsWith('page:b1:2:')));

  const redeployed = harness();
  redeployed.deps.buildId = 'b2';
  for (const [k, v] of h.kvh.store) redeployed.kvh.store.set(k, v);
  const after = await handleWithEdgeCache(req('/reports'), redeployed.deps);
  assert.equal(after.headers.get('x-edge-cache'), 'MISS');
});

test('a KV write failure is ignored: the page is still served and cached in the colo', async () => {
  const h = harness({
    kv: {
      put: async () => {
        throw new Error('KV PUT failed: 429 daily limit exceeded');
      },
    },
  });
  const res = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(await res.text(), 'page /reports');
  await assert.doesNotReject(h.settle());
  assert.equal(h.cache.store.size, 1);
});

test('after a KV write failure, this isolate stops attempting writes for a while', async () => {
  const h = harness({
    kv: {
      put: async () => {
        throw new Error('daily limit');
      },
    },
  });
  await handleWithEdgeCache(req('/a'), h.deps);
  await h.settle();
  await handleWithEdgeCache(req('/b'), h.deps);
  await h.settle();
  assert.equal(h.kvh.writes, 1);
});

test('a KV read that throws falls back to rendering', async () => {
  const h = harness({
    kv: {
      get: async () => {
        throw new Error('KV down');
      },
    },
  });
  const res = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'MISS');
  assert.equal(h.originCalls, 1);
});

test('a KV read that hangs times out and falls back to rendering', async () => {
  const h = harness({ kv: { get: () => new Promise(() => {}) }, readTimeoutMs: 20 });
  const started = Date.now();
  const res = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'MISS');
  assert.equal(await res.text(), 'page /reports');
  assert.ok(Date.now() - started < 1_000);
});

test('a corrupt KV value is treated as a miss', async () => {
  const h = harness({ kv: { get: async () => new Uint8Array([1, 2, 3]).buffer } });
  const res = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(res.headers.get('x-edge-cache'), 'MISS');
  assert.equal(await res.text(), 'page /reports');
});

test('bypass rules are unchanged: nothing reads or writes KV', async () => {
  const h = harness();
  for (const r of [
    req('/edit/abc'),
    req('/admin'),
    req('/api/x'),
    req('/entries?page=2'),
    req('/', { headers: { cookie: 'mc_fresh=1' } }),
    req('/submit', { method: 'POST', headers: { 'next-action': 'x' } }),
  ]) {
    const res = await handleWithEdgeCache(r, h.deps);
    assert.equal(res.headers.get('x-edge-cache'), 'BYPASS');
  }
  await h.settle();
  assert.equal(h.kvh.reads, 0);
  assert.equal(h.kvh.writes, 0);
});

test('responses with Set-Cookie are never stored in KV', async () => {
  const h = harness({ origin: () => new Response('x', { status: 200, headers: { 'set-cookie': 'a=1' } }) });
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  assert.equal(h.kvh.writes, 0);
});

test('only 200s go to KV: a 404 is cached per colo but costs no KV write', async () => {
  const h = harness({ origin: () => new Response('nope', { status: 404 }) });
  await handleWithEdgeCache(req('/colors/not-a-color'), h.deps);
  await h.settle();
  assert.equal(h.cache.store.size, 1);
  assert.equal(h.kvh.writes, 0);
});

test('errors are never stored in KV', async () => {
  const h = harness({ origin: () => new Response('boom', { status: 500 }) });
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  assert.equal(h.kvh.writes, 0);
});

test('a degraded render (failed data read) is never stored in KV', async () => {
  const h = harness({ failed: true });
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  assert.equal(h.kvh.writes, 0);
  assert.equal(h.cache.store.size, 0);
});

test('social card paths never use the page KV (they have their own og: keys)', async () => {
  const h = harness();
  await handleWithEdgeCache(req('/colors/smyrna-green/opengraph-image'), h.deps);
  await h.settle();
  assert.equal(h.kvh.reads, 0);
  assert.equal(h.kvh.writes, 0);
  assert.equal(h.cache.store.size, 1);
});

test('a body over the size cap is not stored in KV', async () => {
  const big = 'x'.repeat(PAGE_KV_MAX_BYTES + 1);
  const h = harness({ origin: () => new Response(big, { status: 200 }) });
  await handleWithEdgeCache(req('/'), h.deps);
  await h.settle();
  assert.equal(h.kvh.writes, 0);
});

test('a long path still gets a short key', async () => {
  const h = harness();
  await handleWithEdgeCache(req(`/colors/${'a'.repeat(900)}`), h.deps);
  await h.settle();
  const [key] = [...h.kvh.store.keys()];
  assert.ok(new TextEncoder().encode(key).length <= 512);
});

test('without a KV binding behaviour is exactly the colo cache', async () => {
  const h = harness({ noKv: true });
  const first = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(first.headers.get('x-edge-cache'), 'MISS');
  await h.settle();
  const second = await handleWithEdgeCache(req('/reports'), h.deps);
  assert.equal(second.headers.get('x-edge-cache'), 'HIT');
});

test('encodePage/decodePage round-trip status, headers and body; vary and cookies are not kept', async () => {
  const body = new TextEncoder().encode('héllo').buffer as ArrayBuffer;
  const encoded = encodePage(
    200,
    new Headers({ 'content-type': 'text/x-component', link: '</a.css>; rel=preload', vary: 'rsc', 'x-nextjs-stale-time': '300' }),
    body
  );
  assert.ok(encoded);
  const decoded = decodePage(encoded);
  assert.ok(decoded);
  assert.equal(decoded.status, 200);
  assert.equal(new TextDecoder().decode(decoded.body), 'héllo');
  const headers = new Headers(decoded.headers);
  assert.equal(headers.get('content-type'), 'text/x-component');
  assert.equal(headers.get('link'), '</a.css>; rel=preload');
  assert.equal(headers.get('x-nextjs-stale-time'), '300');
  assert.equal(headers.has('vary'), false);
});

test('encodePage refuses compressed bodies and cookies', () => {
  const body = new ArrayBuffer(4);
  assert.equal(encodePage(200, new Headers({ 'content-encoding': 'gzip' }), body), null);
  assert.equal(encodePage(200, new Headers({ 'set-cookie': 'a=1' }), body), null);
});

test('the request log line reports HIT-KV', () => {
  const line = requestLogLine(req('/reports'), new Response(null, { headers: { 'x-edge-cache': 'HIT-KV' } }), 'AMS');
  assert.equal(JSON.parse(line).cache, 'HIT-KV');
});
