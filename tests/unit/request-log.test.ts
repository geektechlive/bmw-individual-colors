import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestLogLine } from '../../src/lib/request-log';

const SITE = 'https://mcolors.geektechlive.com';

function res(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

test('a page request logs kind, method, path, status, cache layer result and colo (#25)', () => {
  const line = requestLogLine(new Request(`${SITE}/colors/x`, { method: 'HEAD' }), res(200, { 'x-edge-cache': 'HIT' }), 'IAD');
  assert.deepEqual(JSON.parse(line), {
    msg: 'request',
    kind: 'page',
    method: 'HEAD',
    path: '/colors/x',
    status: 200,
    cache: 'HIT',
    colo: 'IAD',
  });
});

test('RSC, server-action and OG requests are told apart (#25)', () => {
  const rsc = requestLogLine(new Request(`${SITE}/`, { headers: { rsc: '1' } }), res(200, { 'x-edge-cache': 'MISS' }), null);
  assert.equal(JSON.parse(rsc).kind, 'rsc');
  const action = requestLogLine(new Request(`${SITE}/submit`, { method: 'POST', headers: { 'next-action': 'abc' } }), res(303), null);
  assert.equal(JSON.parse(action).kind, 'action');
  const og = requestLogLine(new Request(`${SITE}/colors/x/opengraph-image`), res(200, { 'x-og-cache': 'HIT' }), null);
  assert.deepEqual([JSON.parse(og).kind, JSON.parse(og).cache], ['og', 'HIT']);
});

test('query strings are never logged (they could carry tokens) (#25)', () => {
  const line = requestLogLine(new Request(`${SITE}/admin?token=secret`), res(200), null);
  assert.ok(!line.includes('secret'));
  assert.equal(JSON.parse(line).path, '/admin');
  assert.equal(JSON.parse(line).query, true);
});

test('a response with no cache header logs cache as null (#25)', () => {
  assert.equal(JSON.parse(requestLogLine(new Request(`${SITE}/`), res(404), null)).cache, null);
});
