import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BMW_COLORS } from '../../src/lib/colors';
import { PAINT_FINISH, getPaintFinish, FINISHES } from '../../src/lib/paint-finish';

// Lookup order (#44, spec "Paint swatch"): hand-filled catalog value, then the name
// (Frozen, then Pearl, then Metallic), then solid.

test('a hand-filled catalog finish wins even when the name says nothing', () => {
  assert.equal(PAINT_FINISH['San Marino Blue'], 'metallic');
  assert.equal(getPaintFinish('San Marino Blue'), 'metallic');
});

test('catalog lookup ignores case and extra spaces', () => {
  assert.equal(getPaintFinish('  san marino   BLUE '), 'metallic');
});

test('a paint outside the catalog takes its finish from the name: Frozen first', () => {
  assert.equal(getPaintFinish('Frozen Brilliant White Metallic'), 'frozen');
});

test('then Pearl', () => {
  assert.equal(getPaintFinish('Some Green Pearl Metallic'), 'pearl');
});

test('then Metallic', () => {
  assert.equal(getPaintFinish('Aventurin Red Metallic'), 'metallic');
});

test('anything else is solid', () => {
  assert.equal(getPaintFinish('Imola Red'), 'solid');
  assert.equal(getPaintFinish('Not A Real Paint'), 'solid');
});

test('empty or missing names are solid, not an error', () => {
  assert.equal(getPaintFinish(''), 'solid');
  assert.equal(getPaintFinish(undefined), 'solid');
});

test('every catalog finish is a known finish and names a catalog paint', () => {
  for (const [name, finish] of Object.entries(PAINT_FINISH)) {
    assert.ok(FINISHES.includes(finish), `${name}: ${finish}`);
    assert.ok(name in BMW_COLORS, `${name} is not in BMW_COLORS`);
  }
});

test('a catalog entry never contradicts what the paint name says', () => {
  for (const [name, finish] of Object.entries(PAINT_FINISH)) {
    if (/frozen/i.test(name)) assert.equal(finish, 'frozen', name);
    else if (/pearl/i.test(name)) assert.equal(finish, 'pearl', name);
    else if (/metallic/i.test(name)) assert.equal(finish, 'metallic', name);
  }
});
