import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optionToPick, stepActive, enterIndex, isComposing } from '../../src/components/form/combobox-nav';

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

const green = ['British Racing Green', 'Irish Green', 'Green'];

test('enterIndex opens the highlighted option first', () => {
  assert.equal(enterIndex(1, 'green', green), 1);
});

test('enterIndex falls back to the exact name match, ignoring case', () => {
  assert.equal(enterIndex(-1, 'GREEN', green), 2);
});

test('enterIndex falls back to the first match when nothing is exact', () => {
  assert.equal(enterIndex(-1, 'gree', green), 0);
});

test('enterIndex ignores a stale highlight, trims the text, and does nothing with no match', () => {
  assert.equal(enterIndex(9, 'irish green', green), 1);
  assert.equal(enterIndex(-1, '  green ', green), 2);
  assert.equal(enterIndex(-1, 'zzzz', []), -1);
  assert.equal(enterIndex(3, 'zzzz', []), -1);
});

test('enterIndex guesses nothing when nothing is typed and nothing is highlighted', () => {
  assert.equal(enterIndex(-1, '', green), -1);
  assert.equal(enterIndex(-1, '   ', green), -1);
  assert.equal(enterIndex(2, '', green), 2);
});

test('isComposing is true for an IME composition event or the legacy 229 key code', () => {
  assert.equal(isComposing({ keyCode: 13, nativeEvent: { isComposing: true } }), true);
  assert.equal(isComposing({ keyCode: 229, nativeEvent: { isComposing: false } }), true);
  assert.equal(isComposing({ keyCode: 13, nativeEvent: { isComposing: false } }), false);
});
