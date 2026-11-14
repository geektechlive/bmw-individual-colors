import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mostRegistered,
  newestEntry,
  rarePaintCount,
  topPaintsByHue,
  familyTicks,
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

test('topPaintsByHue keeps the most-built paints, then orders them by hue', () => {
  const counts = [
    cc('Blue', 10, '#1e4c8c'),
    cc('Red', 8, '#a51c1c'),
    cc('Grey', 6, '#808080'),
    cc('Green', 1, '#1a6a2a'),
  ];
  assert.deepEqual(topPaintsByHue(counts, 3).map((p) => p.color), ['Red', 'Blue', 'Grey']);
});

test('topPaintsByHue breaks a tie at the cutoff by name so the result is stable', () => {
  const counts = [cc('Zed', 2, '#a51c1c'), cc('Alpha', 2, '#1e4c8c')];
  assert.deepEqual(topPaintsByHue(counts, 1).map((p) => p.color), ['Alpha']);
  assert.deepEqual(topPaintsByHue([], 5), []);
});

test('familyTicks marks where each family starts, as a share of all builds', () => {
  const wall = [cc('San Marino Blue', 6), cc('Riviera Blue', 2), cc('Twilight Purple', 2)];
  const ticks = familyTicks(wall);
  assert.deepEqual(ticks.map((t) => t.family), ['Blues', 'Purples']);
  assert.equal(ticks[0].start, 0);
  assert.equal(ticks[1].start, 0.8);
  assert.ok(Math.abs(ticks[0].share - 0.8) < 1e-9);
  assert.deepEqual(familyTicks([]), []);
});
