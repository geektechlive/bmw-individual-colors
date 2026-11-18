import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mostRegistered,
  newestEntry,
  rarePaintCount,
  wallPaintsByHue,
  wallRuns,
  singleBuildPaints,
  singleBuildLine,
} from '../../src/lib/home-facts';
import type { BmwEntry, ColorCount } from '../../src/types';

const cc = (color: string, count: number, hex = '#1e4c8c'): ColorCount => ({ color, count, hex });
const entry = (id: string, ext_color: string, created_at: string) =>
  ({ id, ext_color, created_at }) as BmwEntry;

test('mostRegistered returns the paint with the most builds', () => {
  assert.equal(mostRegistered([cc('A', 3), cc('B', 9), cc('C', 1)])?.color, 'B');
});

test('mostRegistered keeps the first paint on a tie and returns null with no data', () => {
  assert.equal(mostRegistered([cc('A', 5), cc('B', 5)])?.color, 'A');
  assert.equal(mostRegistered([]), null);
});

test('newestEntry picks the latest created_at regardless of order', () => {
  const list = [
    entry('1', 'A', '2026-01-01T00:00:00Z'),
    entry('2', 'B', '2026-03-01T00:00:00Z'),
    entry('3', 'C', '2026-02-01T00:00:00Z'),
  ];
  assert.equal(newestEntry(list)?.id, '2');
  assert.equal(newestEntry([]), null);
});

test('rarePaintCount counts paints with one or two builds', () => {
  assert.equal(rarePaintCount([cc('A', 1), cc('B', 2), cc('C', 3), cc('D', 10)]), 2);
  assert.equal(rarePaintCount([]), 0);
});

const palette = [
  cc('Blue', 10, '#1e4c8c'),
  cc('Red', 8, '#a51c1c'),
  cc('Grey', 6, '#808080'),
  cc('Green', 1, '#1a6a2a'),
  cc('Crimson', 1, '#c41c1c'),
];

test('wallPaintsByHue lists every paint, in hue order, one-build paints included', () => {
  const wall = wallPaintsByHue(palette);
  assert.equal(wall.length, palette.length);
  assert.deepEqual(wall.map((p) => p.color), ['Red', 'Crimson', 'Green', 'Blue', 'Grey']);
  assert.deepEqual(wallPaintsByHue([]), []);
});

test('wallPaintsByHue does not mutate its input', () => {
  const input = [...palette];
  wallPaintsByHue(input);
  assert.deepEqual(input, palette);
});

test('wallRuns groups neighbouring same-family paints into runs that total their builds', () => {
  const wall = [
    cc('San Marino Blue', 6),
    cc('Riviera Blue', 2),
    cc('Twilight Purple', 2),
    cc('Alpine White', 1, '#f2f2f2'),
  ];
  const runs = wallRuns(wall);
  assert.deepEqual(runs.map((r) => r.family), ['Blues', 'Purples', 'Greys & Blacks']);
  assert.deepEqual(runs.map((r) => r.total), [8, 2, 1]);
  assert.deepEqual(runs[0].paints.map((p) => p.color), ['San Marino Blue', 'Riviera Blue']);
  assert.deepEqual(wallRuns([]), []);
});

test('wallRuns keeps every paint exactly once', () => {
  const runs = wallRuns(wallPaintsByHue(palette));
  assert.equal(runs.reduce((n, r) => n + r.paints.length, 0), palette.length);
});

test('singleBuildPaints is exactly the paints with one build, in hue order', () => {
  assert.deepEqual(singleBuildPaints(palette).map((p) => p.color), ['Crimson', 'Green']);
  assert.deepEqual(singleBuildPaints([cc('A', 2), cc('B', 3)]), []);
});

test('singleBuildLine uses the singular form for one paint', () => {
  assert.equal(singleBuildLine(23), '23 paints have one build registered so far.');
  assert.equal(singleBuildLine(2), '2 paints have one build registered so far.');
  assert.equal(singleBuildLine(1), '1 paint has one build registered so far.');
});
