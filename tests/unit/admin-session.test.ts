import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_S,
  adminCookieOptions,
  createAdminSession,
  verifyAdminSession,
} from '../../src/lib/admin-session';

const SECRETS = { sessionSecret: 's'.repeat(43), adminToken: 'a'.repeat(43) };
const NOW = 1_800_000_000; // seconds

test('a fresh session verifies until it expires (#32)', async () => {
  const cookie = await createAdminSession(NOW, SECRETS);
  assert.match(cookie, /^v1\.\d+\.[0-9a-f]{64}$/);
  assert.equal(await verifyAdminSession(cookie, NOW, SECRETS), true);
  assert.equal(await verifyAdminSession(cookie, NOW + ADMIN_SESSION_TTL_S - 1, SECRETS), true);
  assert.equal(await verifyAdminSession(cookie, NOW + ADMIN_SESSION_TTL_S, SECRETS), false);
});

test('a tampered expiry or signature is rejected (#32)', async () => {
  const cookie = await createAdminSession(NOW, SECRETS);
  const [v, exp, sig] = cookie.split('.');
  assert.equal(await verifyAdminSession(`${v}.${Number(exp) + 86_400}.${sig}`, NOW, SECRETS), false);
  const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
  assert.equal(await verifyAdminSession(`${v}.${exp}.${flipped}`, NOW, SECRETS), false);
});

test('rotating either the session secret or the admin token revokes existing sessions (#32)', async () => {
  const cookie = await createAdminSession(NOW, SECRETS);
  assert.equal(await verifyAdminSession(cookie, NOW, { ...SECRETS, sessionSecret: 'x'.repeat(43) }), false);
  assert.equal(await verifyAdminSession(cookie, NOW, { ...SECRETS, adminToken: 'b'.repeat(43) }), false);
});

test('malformed, empty or missing cookies are rejected without throwing (#32)', async () => {
  for (const c of [undefined, '', 'v1', 'v1..', 'v2.1900000000.' + '0'.repeat(64), 'v1.abc.' + '0'.repeat(64), 'v1.1900000000.zz']) {
    assert.equal(await verifyAdminSession(c, NOW, SECRETS), false, String(c));
  }
});

test('missing secrets never verify and never mint a session (#32)', async () => {
  const cookie = await createAdminSession(NOW, SECRETS);
  assert.equal(await verifyAdminSession(cookie, NOW, { sessionSecret: '', adminToken: SECRETS.adminToken }), false);
  assert.equal(await verifyAdminSession(cookie, NOW, { sessionSecret: SECRETS.sessionSecret, adminToken: '' }), false);
  await assert.rejects(createAdminSession(NOW, { sessionSecret: '', adminToken: 'a' }));
  await assert.rejects(createAdminSession(NOW, { sessionSecret: 's', adminToken: '' }));
});

test('the cookie is HttpOnly, Secure, SameSite=Strict, site-wide, and expires with the session (#32)', () => {
  assert.equal(ADMIN_COOKIE, 'mc_admin');
  assert.deepEqual(adminCookieOptions(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_S,
  });
});
