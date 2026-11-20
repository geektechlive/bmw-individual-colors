import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BMW_COLORS, COLOR_ALIASES, canonicalColorName, colorToSlug, cleanPaintName } from '../../src/lib/colors';
import { snapColorName, validateEntryInput } from '../../src/lib/validation';
import { mergePaintNames, pickNameForSlug } from '../../src/lib/paint-names';

// #55: look-alike paint names must not shadow catalog paints or share a slug.

test('cleanPaintName strips zero-width, bidi and control characters, then trims and collapses', () => {
  assert.equal(cleanPaintName('Twilight​ Purple'), 'Twilight Purple');
  assert.equal(cleanPaintName('‮Twilight\u0000  Purple﻿ '), 'Twilight Purple');
  assert.equal(cleanPaintName('​‌'), '');
});

test('snapColorName snaps hyphen, underscore and invisible look-alikes to the catalog (#55)', () => {
  for (const raw of ['Twilight-Purple', 'twilight_purple', 'Twilight​ Purple', 'TWILIGHT  PURPLE', 'Twilight Purple!']) {
    assert.equal(snapColorName(raw), 'Twilight Purple Pearl effect', raw);
  }
  assert.equal(snapColorName('Enzian-Blue'), 'Gentian Blue');
});

test('an unknown paint keeps its own text, minus invisible characters (#55)', () => {
  assert.equal(snapColorName('Some​ New-Color'), 'Some New-Color');
});

test('canonicalColorName also folds look-alikes already stored (#55)', () => {
  assert.equal(canonicalColorName('Twilight-Purple'), 'Twilight Purple Pearl effect');
  assert.equal(canonicalColorName('Twilight​ Purple'), 'Twilight Purple Pearl effect');
});

test('names with no ASCII letters or digits get a stable, non-empty, distinct slug (#55)', () => {
  const a = colorToSlug('!!!');
  const b = colorToSlug('紫');
  const c = colorToSlug('緑');
  for (const s of [a, b, c]) assert.match(s, /^paint-[0-9a-f]{8}$/);
  assert.equal(colorToSlug('!!!'), a);
  assert.equal(new Set([a, b, c]).size, 3);
  assert.equal(colorToSlug('   '), '');
  assert.equal(colorToSlug('Twilight Purple'), 'twilight-purple');
});

test('validateEntryInput rejects a paint that is only invisible characters (#55)', () => {
  const fd = new FormData();
  fd.set('model_year', '2023');
  fd.set('body_style', 'M3');
  fd.set('forum_username', 'someone');
  fd.set('ext_color', '​​');
  const r = validateEntryInput(fd);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, 'Individual color is required.');
});

test('no two catalog or alias names share a slug unless they are the same paint', () => {
  const seen = new Map<string, string>();
  const names = [...Object.keys(BMW_COLORS), ...Object.keys(COLOR_ALIASES)];
  for (const name of names) {
    const slug = colorToSlug(name);
    assert.notEqual(slug, '', name);
    const canonical = canonicalColorName(name);
    const prior = seen.get(slug);
    assert.ok(prior === undefined || prior === canonical, `${name} collides with ${prior}`);
    seen.set(slug, canonical);
  }
});

test('pickNameForSlug prefers the catalog name over a look-alike (#55)', () => {
  assert.equal(pickNameForSlug('twilight-purple-pearl-effect', ['Twilight-Purple', 'Twilight Purple']), 'Twilight Purple Pearl effect');
  assert.equal(pickNameForSlug('twilight-purple-pearl-effect', ['Twilight-Purple']), 'Twilight Purple Pearl effect');
  assert.equal(pickNameForSlug('gentian-blue', []), 'Gentian Blue');
  assert.equal(pickNameForSlug('nothing-here', ['Other']), null);
  assert.equal(pickNameForSlug('constructor', ['Other']), null);
});

test('mergePaintNames gives every slug exactly one display name, independent of row order (#55)', () => {
  const rows = ['Foo-Bar', 'Foo Bar', 'Foo Bar', 'Twilight-Purple', 'Zed'];
  const forward = mergePaintNames(rows);
  const backward = mergePaintNames([...rows].reverse());
  assert.equal(forward.get('Foo-Bar'), 'Foo Bar');
  assert.equal(forward.get('Foo Bar'), 'Foo Bar');
  assert.equal(forward.get('Twilight-Purple'), 'Twilight Purple Pearl effect');
  assert.equal(forward.get('Zed'), 'Zed');
  assert.deepEqual([...forward.entries()].sort(), [...backward.entries()].sort());
  const display = new Set(forward.values());
  assert.equal(new Set([...display].map(colorToSlug)).size, display.size);
});

test('mergePaintNames breaks an equal-count tie alphabetically', () => {
  assert.equal(mergePaintNames(['B-x', 'B x']).get('B-x'), 'B x');
});
