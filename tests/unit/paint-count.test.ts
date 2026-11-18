import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintNoun, matchCountText } from '../../src/lib/paint-count';

test('paintNoun is singular only for exactly one paint', () => {
  assert.equal(paintNoun(1), 'paint');
  assert.equal(paintNoun(0), 'paints');
  assert.equal(paintNoun(2), 'paints');
  assert.equal(paintNoun(71), 'paints');
});

test('matchCountText announces how many paints match (#83)', () => {
  assert.equal(matchCountText(29), '29 paints');
  assert.equal(matchCountText(1), '1 paint');
  assert.equal(matchCountText(0), '');
});
