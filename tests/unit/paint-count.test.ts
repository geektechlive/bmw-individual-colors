import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintNoun } from '../../src/lib/paint-count';

test('paintNoun is singular only for exactly one paint', () => {
  assert.equal(paintNoun(1), 'paint');
  assert.equal(paintNoun(0), 'paints');
  assert.equal(paintNoun(2), 'paints');
  assert.equal(paintNoun(71), 'paints');
});
