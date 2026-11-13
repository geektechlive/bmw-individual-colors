import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleOgImage, ogSlug, type OgCacheDeps } from '../../src/lib/og-cache';

const SITE = 'https://mcolors.geektechlive.com';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

function req(path: string, init: RequestInit = {}): Request {
  return new Request(`${SITE}${path}`, init);
}

/** In-memory stand-in for a Workers KV namespace. */
function memoryKv() {
  const store = new Map<string, { value: ArrayBuffer; ttl?: number }>();
  return {
    store,
    async get(key: string, type: 'arrayBuffer') {
      assert.equal(type, 'arrayBuffer');
      return store.get(key)?.value ?? null;
    },
    async put(key: string, value: ArrayBuffer, opts?: { expirationTtl?: number }) {
      store.set(key, { value, ttl: opts?.expirationTtl });
    },
  };
}

function harness(opts: { version?: string | null; origin?: (r: Request) => Response; failed?: boolean } = {}) {
  const kv = memoryKv();
  const pending: Promise<unknown>[] = [];
  let originCalls = 0;
  const deps: OgCacheDeps = {
    store: kv,
    buildId: 'b1',
    getVersion: async () => (opts.version === undefined ? '7' : opts.version),
    origin: async (r) => {
      originCalls += 1;
      return opts.origin
        ? opts.origin(r)
        : new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });
    },
    waitUntil: (p) => void pending.push(p),
    renderFailed: () => opts.failed === true,
  };
  return {
    deps,
    kv,
    get originCalls() {
      return originCalls;
    },
    settle: () => Promise.all(pending),
  };
}

test('ogSlug matches only color OG image paths', () => {
  assert.equal(ogSlug('/colors/smyrna-green/opengraph-image'), 'smyrna-green');
  assert.equal(ogSlug('/colors/smyrna-green'), null);
  assert.equal(ogSlug('/colors/a/b/opengraph-image'), null);
  assert.equal(ogSlug('/colors/Smyrna%20Green/opengraph-image'), null);
  assert.equal(ogSlug('/opengraph-image'), null);
});

test('non-OG requests are not handled (null), so the page cache takes them', async () => {
  const h = harness();
  assert.equal(await handleOgImage(req('/colors/smyrna-green'), h.deps), null);
  assert.equal(h.originCalls, 0);
});

test('a miss renders once, stores the PNG in KV, and a second request is a HIT without rendering', async () => {
  const h = harness();
  const first = await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  assert.ok(first);
  assert.equal(first.headers.get('x-og-cache'), 'MISS');
  assert.deepEqual(new Uint8Array(await first.arrayBuffer()), PNG);
  await h.settle();

  const second = await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  assert.ok(second);
  assert.equal(second.headers.get('x-og-cache'), 'HIT');
  assert.equal(second.headers.get('content-type'), 'image/png');
  assert.deepEqual(new Uint8Array(await second.arrayBuffer()), PNG);
  assert.equal(h.originCalls, 1);
});

test('the KV key carries build id, slug and data version; entries expire', async () => {
  const h = harness();
  await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  await h.settle();
  const [key] = [...h.kv.store.keys()];
  assert.equal(key, 'og:b1:smyrna-green:7');
  assert.ok((h.kv.store.get(key)?.ttl ?? 0) > 0);
});

test('a new data version or a new deploy misses (fresh build count / new layout)', async () => {
  const h = harness();
  await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  await h.settle();
  h.deps.getVersion = async () => '8';
  const bumped = await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  assert.equal(bumped?.headers.get('x-og-cache'), 'MISS');
  await h.settle();
  h.deps.buildId = 'b2';
  const redeployed = await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  assert.equal(redeployed?.headers.get('x-og-cache'), 'MISS');
});

test('query strings are ignored, so they cannot force renders or mint keys', async () => {
  const h = harness();
  await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  await h.settle();
  const busted = await handleOgImage(req('/colors/smyrna-green/opengraph-image?x=1'), h.deps);
  assert.equal(busted?.headers.get('x-og-cache'), 'HIT');
  assert.equal(h.kv.store.size, 1);
});

test('non-200, non-PNG and degraded renders are served but never stored', async () => {
  for (const origin of [
    () => new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } }),
    () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
  ]) {
    const h = harness({ origin });
    const res = await handleOgImage(req('/colors/x/opengraph-image'), h.deps);
    await h.settle();
    assert.equal(h.kv.store.size, 0);
    assert.ok(res);
  }
  const degraded = harness({ failed: true });
  await handleOgImage(req('/colors/x/opengraph-image'), degraded.deps);
  await degraded.settle();
  assert.equal(degraded.kv.store.size, 0);
});

test('a degraded render is served with no-store so crawlers do not hold it (#24 review)', async () => {
  const h = harness({ failed: true });
  const res = await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  assert.equal(res?.status, 200);
  assert.match(res?.headers.get('cache-control') ?? '', /no-store/);
});

test('a non-PNG result (e.g. 404 for an unknown slug) is passed through unchanged (#24 review)', async () => {
  const h = harness({
    origin: () => new Response('nf', { status: 404, headers: { 'x-edge-cache': 'HIT', 'content-type': 'text/html' } }),
  });
  const res = await handleOgImage(req('/colors/nope/opengraph-image'), h.deps);
  assert.equal(res?.status, 404);
  assert.equal(res?.headers.get('x-edge-cache'), 'HIT', 'the edge cache answered, so junk slugs do not re-render');
});

test('the writer-bypass cookie skips KV and goes straight to origin (#24 review)', async () => {
  const h = harness();
  await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  await h.settle();
  const fresh = await handleOgImage(
    req('/colors/smyrna-green/opengraph-image', { headers: { cookie: 'mc_fresh=1' } }),
    h.deps
  );
  assert.equal(fresh?.headers.get('x-og-cache'), null);
  assert.equal(h.originCalls, 2);
});

test('without a data version the handler steps aside (null) rather than guess', async () => {
  const h = harness({ version: null });
  assert.equal(await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps), null);
});

test('without a KV binding the handler steps aside (null)', async () => {
  const h = harness();
  h.deps.store = undefined;
  assert.equal(await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps), null);
});

test('HEAD is answered without a body and renders as GET', async () => {
  const h = harness();
  const methods: string[] = [];
  h.deps.origin = async (r) => {
    methods.push(r.method);
    return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });
  };
  const res = await handleOgImage(req('/colors/smyrna-green/opengraph-image', { method: 'HEAD' }), h.deps);
  assert.equal(res?.body, null);
  assert.deepEqual(methods, ['GET']);
});

test('a KV read failure falls back to rendering instead of erroring', async () => {
  const h = harness();
  h.kv.get = async () => {
    throw new Error('kv down');
  };
  const res = await handleOgImage(req('/colors/smyrna-green/opengraph-image'), h.deps);
  assert.equal(res?.status, 200);
  assert.equal(res?.headers.get('x-og-cache'), 'MISS');
});
