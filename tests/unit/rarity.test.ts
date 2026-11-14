import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRarityLabel } from '../../src/lib/analytics';

// Rarity labels and cut-offs from the approved mockups (owner confirmed 2026-11-14):
// 15+ Very common, 6-14 Common, 3-5 Uncommon, 1-2 Rare.

test('15 or more builds is Very common', () => {
  assert.equal(computeRarityLabel(15), 'Very common');
  assert.equal(computeRarityLabel(26), 'Very common');
});

test('6 to 14 builds is Common', () => {
  assert.equal(computeRarityLabel(6), 'Common');
  assert.equal(computeRarityLabel(14), 'Common');
});

test('3 to 5 builds is Uncommon', () => {
  assert.equal(computeRarityLabel(3), 'Uncommon');
  assert.equal(computeRarityLabel(5), 'Uncommon');
});

test('1 or 2 builds is Rare', () => {
  assert.equal(computeRarityLabel(1), 'Rare');
  assert.equal(computeRarityLabel(2), 'Rare');
});

test('no builds is still Rare, not an error', () => {
  assert.equal(computeRarityLabel(0), 'Rare');
});
