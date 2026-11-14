import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withCurrentOption } from '../../src/components/form/options';

// The edit form must not blank a stored value just because the dropdown doesn't list it
// (e.g. wheels "825M Bi-Color", which the importer's own normalizer produces).

test('a stored value missing from the list is added first', () => {
  assert.deepEqual(withCurrentOption(['826M', '1000M'], '825M Bi-Color'), ['825M Bi-Color', '826M', '1000M']);
});

test('a stored value already in the list changes nothing', () => {
  assert.deepEqual(withCurrentOption(['826M', '1000M'], '826M'), ['826M', '1000M']);
});

test('empty or blank stored values add nothing', () => {
  assert.deepEqual(withCurrentOption(['826M'], ''), ['826M']);
  assert.deepEqual(withCurrentOption(['826M'], '   '), ['826M']);
  assert.deepEqual(withCurrentOption(['826M'], undefined), ['826M']);
});

test('the input list is not changed', () => {
  const list = ['826M'];
  withCurrentOption(list, 'X');
  assert.deepEqual(list, ['826M']);
});
