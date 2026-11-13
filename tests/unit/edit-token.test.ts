import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signEditToken, verifyEditTokenWith } from '../../src/lib/edit-token';

const SECRET = 'e'.repeat(43);
const ID = '1102e69e-1206-48e1-bb88-234c26cd58ee';
const NOW = 1_800_000_000_000; // ms
const EXP = NOW + 60 * 60 * 1000;

test('a token verifies for the same entry, username (any case) and expiry (#32)', async () => {
  const token = await signEditToken(SECRET, ID, 'pnm9576', EXP);
  assert.equal(await verifyEditTokenWith(SECRET, token, ID, 'PNM9576', EXP, NOW), true);
});

test('a token is rejected after it expires (#32)', async () => {
  const token = await signEditToken(SECRET, ID, 'pnm9576', EXP);
  assert.equal(await verifyEditTokenWith(SECRET, token, ID, 'pnm9576', EXP, EXP), false);
});

test('a token cannot be moved to another entry, user, or later expiry (#32)', async () => {
  const token = await signEditToken(SECRET, ID, 'pnm9576', EXP);
  assert.equal(await verifyEditTokenWith(SECRET, token, '00000000-0000-0000-0000-000000000000', 'pnm9576', EXP, NOW), false);
  assert.equal(await verifyEditTokenWith(SECRET, token, ID, 'someoneelse', EXP, NOW), false);
  assert.equal(await verifyEditTokenWith(SECRET, token, ID, 'pnm9576', EXP + 1000, NOW), false);
});

test('a token signed with a different secret (e.g. the admin token) is rejected (#32)', async () => {
  const forged = await signEditToken('a'.repeat(43), ID, 'pnm9576', EXP);
  assert.equal(await verifyEditTokenWith(SECRET, forged, ID, 'pnm9576', EXP, NOW), false);
});

test('an empty secret or token never verifies, and signing refuses an empty secret (#32)', async () => {
  const token = await signEditToken(SECRET, ID, 'pnm9576', EXP);
  assert.equal(await verifyEditTokenWith('', token, ID, 'pnm9576', EXP, NOW), false);
  assert.equal(await verifyEditTokenWith(SECRET, '', ID, 'pnm9576', EXP, NOW), false);
  await assert.rejects(signEditToken('', ID, 'pnm9576', EXP));
});

test('a non-finite expiry is rejected (#32)', async () => {
  const token = await signEditToken(SECRET, ID, 'pnm9576', EXP);
  assert.equal(await verifyEditTokenWith(SECRET, token, ID, 'pnm9576', Number.NaN, NOW), false);
});
