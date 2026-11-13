import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOpenFlags, isKnownModerationError, moderate, type ModerationDeps, type OpenFlagRow } from '../../src/lib/moderation';
import { submitFlag, type FlagDeps } from '../../src/lib/flagging';

const ID = '1102e69e-1206-48e1-bb88-234c26cd58ee';

function modDeps(opts: { authorized?: boolean; status?: string | null; error?: unknown } = {}) {
  const calls: Array<[string, string]> = [];
  const deps: ModerationDeps = {
    isAuthorized: async () => opts.authorized ?? true,
    rpc: async (id, op) => {
      calls.push([id, op]);
      return { status: opts.status === undefined ? 'ok' : opts.status, error: opts.error ?? null };
    },
  };
  return { deps, calls };
}

// ---- moderate (admin) ---------------------------------------------------------

test('without an admin session nothing reaches the database (#32)', async () => {
  for (const op of ['dismiss', 'delete', 'restore']) {
    const m = modDeps({ authorized: false });
    const r = await moderate({ op, id: ID }, m.deps);
    assert.equal(r.ok, false, op);
    assert.equal(m.calls.length, 0, op);
  }
});

test('each op runs one atomic RPC call with the entry id (#31/#32)', async () => {
  for (const op of ['dismiss', 'delete', 'restore'] as const) {
    const m = modDeps();
    assert.deepEqual(await moderate({ op, id: ID }, m.deps), { ok: true, op });
    assert.deepEqual(m.calls, [[ID, op]]);
  }
});

test('unknown ops and non-UUID ids are rejected before the database (#32)', async () => {
  for (const input of [{ op: 'nuke', id: ID }, { op: 'delete', id: 'abc' }, { op: undefined, id: ID }]) {
    const m = modDeps();
    assert.equal((await moderate(input, m.deps)).ok, false);
    assert.equal(m.calls.length, 0);
  }
});

test('database errors and missing entries come back as messages, not throws (#32)', async () => {
  assert.equal((await moderate({ op: 'delete', id: ID }, modDeps({ status: 'not_found' }).deps)).ok, false);
  assert.equal((await moderate({ op: 'delete', id: ID }, modDeps({ status: null, error: new Error('x') }).deps)).ok, false);
});

// ---- submitFlag (public) ---------------------------------------------------------

function flagDeps(opts: { turnstile?: boolean; status?: string | null; error?: unknown } = {}) {
  const calls: unknown[] = [];
  let turnstileCalls = 0;
  const deps: FlagDeps = {
    verifyTurnstile: async () => {
      turnstileCalls += 1;
      return opts.turnstile ?? true;
    },
    reporterHash: async () => 'hash-1',
    rpc: async (args) => {
      calls.push(args);
      return { status: opts.status === undefined ? 'ok' : opts.status, error: opts.error ?? null };
    },
  };
  return { deps, calls, turnstileCalls: () => turnstileCalls };
}

test('a valid flag with a reason is stored with the reporter hash (#31)', async () => {
  const f = flagDeps();
  const r = await submitFlag({ id: ID, reason: 'duplicate', note: ' same car twice ', tsToken: 't' }, f.deps);
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(f.calls, [{ entryId: ID, reason: 'duplicate', note: 'same car twice', reporterHash: 'hash-1' }]);
});

test('invalid input is rejected before Turnstile or the database (#31)', async () => {
  const f = flagDeps();
  const r = await submitFlag({ id: ID, reason: 'other', note: '', tsToken: 't' }, f.deps);
  assert.equal(r.ok, false);
  assert.equal(f.turnstileCalls(), 0);
  assert.equal(f.calls.length, 0);
});

test('a failed Turnstile check never reaches the database (#31)', async () => {
  const f = flagDeps({ turnstile: false });
  assert.equal((await submitFlag({ id: ID, reason: 'duplicate', note: '', tsToken: 't' }, f.deps)).ok, false);
  assert.equal(f.calls.length, 0);
});

test('if the reporter hash cannot be made (secret missing), the flag fails closed (#31 review)', async () => {
  const f = flagDeps();
  f.deps.reporterHash = async () => {
    throw new Error('ADMIN_SESSION_SECRET is not configured.');
  };
  const r = await submitFlag({ id: ID, reason: 'duplicate', note: '', tsToken: 't' }, f.deps);
  assert.equal(r.ok, false);
  assert.equal(f.calls.length, 0);
});

test('admin error messages are only shown when they are ones the app produces (#32 review)', () => {
  assert.equal(isKnownModerationError('That entry no longer exists or was already changed.'), true);
  assert.equal(isKnownModerationError('Call 555-0100 to verify your account.'), false);
  assert.equal(isKnownModerationError(undefined), false);
});

test('duplicate, gone, capped and failed flags each get a clear message (#31)', async () => {
  for (const status of ['duplicate', 'not_found', 'too_many', null]) {
    const r = await submitFlag(
      { id: ID, reason: 'duplicate', note: '', tsToken: 't' },
      flagDeps({ status, error: status === null ? new Error('x') : null }).deps
    );
    assert.equal(r.ok, false, String(status));
    if (!r.ok) assert.match(r.error, /^[A-Z].+\.$/, String(status));
  }
});

// ---- groupOpenFlags (admin queue) ---------------------------------------------

function row(flagId: string, entryId: string, createdAt: string, reason = 'duplicate', note: string | null = null): OpenFlagRow {
  return { id: flagId, reason, note, created_at: createdAt, entry: { id: entryId, ext_color: `c-${entryId}` } as OpenFlagRow['entry'] };
}

test('open flags are grouped per entry, newest flag first, with every reason kept (#31)', () => {
  const groups = groupOpenFlags([
    row('f1', 'e1', '2026-11-13T10:00:00Z', 'wrong_color', 'Isle of Man Green'),
    row('f2', 'e2', '2026-11-13T12:00:00Z'),
    row('f3', 'e1', '2026-11-13T11:00:00Z', 'duplicate'),
  ]);
  assert.deepEqual(groups.map((g) => g.entry.id), ['e2', 'e1']);
  assert.deepEqual(groups[1].flags.map((f) => [f.reason, f.note]), [['duplicate', null], ['wrong_color', 'Isle of Man Green']]);
});

test('rows whose entry is missing are skipped, and the queue is capped (#31)', () => {
  const rows = [row('fx', 'gone', '2026-11-13T10:00:00Z')];
  rows[0].entry = null;
  assert.deepEqual(groupOpenFlags(rows), []);
  const many = Array.from({ length: 150 }, (_, i) => row(`f${i}`, `e${i}`, `2026-11-13T10:${String(i % 60).padStart(2, '0')}:00Z`));
  assert.equal(groupOpenFlags(many, 100).length, 100);
});
