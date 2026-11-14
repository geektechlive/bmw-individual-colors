import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optionToPick, stepActive } from '../../src/components/form/combobox-nav';

const options = ['Black Blue', 'Blue Ridge', 'Blue Sky'];

test('Enter picks nothing until an option was chosen with the keyboard (#57)', () => {
  // activeIndex is -1 until ArrowUp/ArrowDown; hovering must never set it.
  assert.equal(optionToPick(true, -1, options), null);
});

test('Enter picks the keyboard-highlighted option while the list is open (#57)', () => {
  assert.equal(optionToPick(true, 1, options), 'Blue Ridge');
});

test('Enter picks nothing when the list is closed or the index is stale (#57)', () => {
  assert.equal(optionToPick(false, 1, options), null);
  assert.equal(optionToPick(true, 7, options), null);
});

test('stepActive opens on the first or last option, then wraps', () => {
  assert.equal(stepActive(-1, 1, 3, false), 0);
  assert.equal(stepActive(-1, -1, 3, false), 2);
  assert.equal(stepActive(2, 1, 3, true), 0);
  assert.equal(stepActive(0, -1, 3, true), 2);
  assert.equal(stepActive(-1, -1, 3, true), 2);
  assert.equal(stepActive(0, 1, 0, true), -1);
});
