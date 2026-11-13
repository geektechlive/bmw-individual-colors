import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_NOTE_MAX, FLAG_REASONS, validateFlagInput } from '../../src/lib/flag-validation';

const ID = '1102e69e-1206-48e1-bb88-234c26cd58ee';

test('every listed reason is accepted, with an optional note (#31)', () => {
  for (const reason of FLAG_REASONS.filter((r) => r !== 'other')) {
    const r = validateFlagInput({ id: ID, reason, note: '' });
    assert.deepEqual(r, { ok: true, value: { entryId: ID, reason, note: null } }, reason);
  }
});

test('the note is trimmed and kept when given (#31)', () => {
  const r = validateFlagInput({ id: ID, reason: 'wrong_color', note: '  It is Isle of Man Green, not Java  ' });
  assert.deepEqual(r, { ok: true, value: { entryId: ID, reason: 'wrong_color', note: 'It is Isle of Man Green, not Java' } });
});

test('an unknown or missing reason is rejected (#31)', () => {
  for (const reason of ['', 'spam', 'WRONG_COLOR', undefined, null, 3]) {
    const r = validateFlagInput({ id: ID, reason, note: '' });
    assert.equal(r.ok, false, String(reason));
  }
});

test('"other" requires a note (#31)', () => {
  assert.equal(validateFlagInput({ id: ID, reason: 'other', note: '   ' }).ok, false);
  assert.equal(validateFlagInput({ id: ID, reason: 'other', note: undefined }).ok, false);
  assert.equal(validateFlagInput({ id: ID, reason: 'other', note: 'Wrong owner' }).ok, true);
});

test(`notes are capped at ${FLAG_NOTE_MAX} characters, counted like Postgres char_length (#31)`, () => {
  assert.equal(validateFlagInput({ id: ID, reason: 'duplicate', note: 'x'.repeat(FLAG_NOTE_MAX) }).ok, true);
  assert.equal(validateFlagInput({ id: ID, reason: 'duplicate', note: 'x'.repeat(FLAG_NOTE_MAX + 1) }).ok, false);
  // An emoji is 2 UTF-16 units but 1 code point: 280 of them must pass, as in the DB check.
  assert.equal(validateFlagInput({ id: ID, reason: 'duplicate', note: '🚗'.repeat(FLAG_NOTE_MAX) }).ok, true);
  assert.equal(validateFlagInput({ id: ID, reason: 'duplicate', note: '🚗'.repeat(FLAG_NOTE_MAX + 1) }).ok, false);
});

test('the entry id must be a UUID (#31)', () => {
  for (const id of ['', 'abc', '1102e69e-1206-48e1-bb88', `${ID}x`, undefined, 42]) {
    assert.equal(validateFlagInput({ id, reason: 'duplicate', note: '' }).ok, false, String(id));
  }
});

test('errors are user-facing sentences (#31)', () => {
  const r = validateFlagInput({ id: ID, reason: 'other', note: '' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /^[A-Z].+\.$/);
});
