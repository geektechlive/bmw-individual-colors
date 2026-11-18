import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wallStepIndex } from '../../src/components/home/wall-nav';

test('ArrowRight and ArrowLeft move one strip and stop at the ends (#82)', () => {
  assert.equal(wallStepIndex(3, 'ArrowRight', 71), 4);
  assert.equal(wallStepIndex(3, 'ArrowLeft', 71), 2);
  assert.equal(wallStepIndex(70, 'ArrowRight', 71), 70);
  assert.equal(wallStepIndex(0, 'ArrowLeft', 71), 0);
});

test('Home and End jump to the first and last strip (#82)', () => {
  assert.equal(wallStepIndex(30, 'Home', 71), 0);
  assert.equal(wallStepIndex(30, 'End', 71), 70);
});

test('other keys, and an empty wall, are not handled (#82)', () => {
  assert.equal(wallStepIndex(3, 'Enter', 71), null);
  assert.equal(wallStepIndex(3, 'ArrowDown', 71), null);
  assert.equal(wallStepIndex(0, 'ArrowRight', 0), null);
});
