import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hueKey, sortByHue } from '../../src/lib/hue-sort';

// Paint walls and the colors page sort by hue (#46, #47): chromatic paints around the
// color wheel from red, then greys and blacks at the end, light to dark.

test('chromatic paints run around the wheel: red, orange, yellow, green, blue, purple', () => {
  const paints = [
    { name: 'Purple', hex: '#5a3a7a' },
    { name: 'Blue', hex: '#1e4c8c' },
    { name: 'Red', hex: '#a51c1c' },
    { name: 'Green', hex: '#1a6a2a' },
    { name: 'Yellow', hex: '#e8c020' },
    { name: 'Orange', hex: '#d4661e' },
  ];
  assert.deepEqual(sortByHue(paints).map((p) => p.name), ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple']);
});

test('greys come after every chromatic paint, light to dark', () => {
  const paints = [
    { name: 'Black', hex: '#1a1a1a' },
    { name: 'Blue', hex: '#1e4c8c' },
    { name: 'Chalk', hex: '#d8d4cc' },
    { name: 'Grey', hex: '#7a7a7a' },
  ];
  assert.deepEqual(sortByHue(paints).map((p) => p.name), ['Blue', 'Chalk', 'Grey', 'Black']);
});

test('the sort does not change its input', () => {
  const paints = [{ name: 'B', hex: '#1e4c8c' }, { name: 'A', hex: '#a51c1c' }];
  const copy = JSON.stringify(paints);
  sortByHue(paints);
  assert.equal(JSON.stringify(paints), copy);
});

test('ties keep their input order (stable)', () => {
  const paints = [{ name: 'first', hex: '#1e4c8c' }, { name: 'second', hex: '#1e4c8c' }];
  assert.deepEqual(sortByHue(paints).map((p) => p.name), ['first', 'second']);
});

test('reds just below 360 degrees sort with red, not after purple', () => {
  assert.ok(hueKey('#c0102a') < hueKey('#d4661e'), 'a crimson (hue ~350) sorts before orange');
});
