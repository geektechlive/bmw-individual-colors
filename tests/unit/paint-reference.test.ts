import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BMW_COLORS, COLOR_ALIASES, COLOR_FAMILY_MAP, aliasRedirectSlug, canonicalColorName, colorToSlug, paintNameSpellings } from '../../src/lib/colors';
import { PAINT_REFERENCE } from '../../src/lib/paint-reference';
import { paintReference } from '../../src/lib/paint-source';
import { snapColorName } from '../../src/lib/validation';

// Paint names follow BMW (#93): the paint code is the identity, the display name follows BMW.

// [name an owner typed or the registry stored, name BMW uses, BMW code]
const RENAMES: ReadonlyArray<readonly [string, string, string]> = [
  ['Twilight Purple', 'Twilight Purple Pearl effect', 'P28'],
  ['San Marino Blue', 'San Marino Blue Metallic', 'B51'],
  ['Frozen Dark Grey', 'Frozen Dark Grey II Metallic', 'P79'],
  ['Grigio Telesto', 'Grigio Telesto Pearl Effect Metallic', 'P6M'],
  ['Violet Blue', 'Violet Blue II', 'P6F'],
  ['Wildberry', 'Wildberry Metallic', 'T09'],
  ['Frozen Deep Grey', 'Frozen Deep Grey Metallic', 'P7X'],
  ['Oxford Green II Metallic', 'Oxford Green', '430'],
  ['Sepia Metallic III', 'Sepia III Metallic', 'S0N'],
  ['Aegean Blue', 'Aegean Blue Metallic', '336'],
  ['Daytona Violet', 'Daytona Violet Metallic', '283'],
  ['Frozen Black', 'Frozen Black Metallic', 'U91'],
  ['Frozen Portimao Blue', 'Frozen Portimao Blue Metallic', 'X1E'],
  ['Velvet Blue', 'Velvet Blue Metallic', '379'],
  ['Cosmos Black', 'Cosmos Black Metallic', '303'],
  ['Mauritius Blue', 'Mauritius Blue Metallic', '287'],
  ['Thunder', 'Thunder Metallic', 'P6L'],
  ['Goodwood Green Pearl', 'Goodwood Green Pearl Effect Metallic', 'W67'],
  ['Interlagos Blue', 'Interlagos Blue Metallic', 'A30'],
  ['Isle of Man Green', 'Isle of Man Green Metallic', 'C4G'],
  ['Jerez Black', 'Jerez Black Metallic', 'A73'],
  ['Le Mans Blue', 'Le Mans Blue Metallic', '381'],
  ['Ruby Star Neo', 'Ruby Star (NEO)', 'P9L'],
  ['Sakhir Orange III', 'Sakhir Orange III Metallic', 'P93'],
  ['Signal Green Uni', 'Signal Green', 'P56'],
  ['Space Silver', 'Space Silver Metallic', 'C67'],
  ['Marina Bay Blue', 'Marina Bay Blue Metallic', 'C1K'],
  // merges: two stored names, one BMW paint
  ['Tanzanite Blue', 'Tanzanite Blue II Metallic', 'C3Z'],
  ['Tanzanite Blue II', 'Tanzanite Blue II Metallic', 'C3Z'],
  ['Santorini Blue', 'Santorin Blue II', '327'],
  ['Santorini Blue II', 'Santorin Blue II', '327'],
  ['Dakar Yellow', 'Dakar Yellow II', '337'],
  ['Fire Orange', 'Fire Orange III', 'P7E'],
];

test('every rename and merge resolves to the BMW name on read, and on write (#93)', () => {
  for (const [old, name, code] of RENAMES) {
    assert.equal(canonicalColorName(old), name, old);
    assert.equal(snapColorName(old), name, `${old} (write)`);
    assert.equal(snapColorName(old.toUpperCase()), name, `${old} upper (write)`);
    assert.ok(Object.hasOwn(BMW_COLORS, name), `${name} is a listed color`);
    assert.equal(PAINT_REFERENCE[name].code, code, name);
    assert.equal(Object.hasOwn(BMW_COLORS, old), false, `${old} is no longer a listed color`);
  }
});

test('the old URL of every rename redirects to the BMW name page (#93)', () => {
  for (const [old, name] of RENAMES) {
    // "Ruby Star Neo" and "Ruby Star (NEO)" share one slug: same URL, nothing to redirect.
    const expected = colorToSlug(old) === colorToSlug(name) ? null : colorToSlug(name);
    assert.equal(aliasRedirectSlug(colorToSlug(old)), expected, old);
  }
});

test('owner rulings: C3Z uses the BMW US spelling, São Paulo Yellow keeps its accent (#93)', () => {
  assert.equal(PAINT_REFERENCE['Tanzanite Blue II Metallic'].source, 'us-doc');
  assert.equal(Object.hasOwn(BMW_COLORS, 'Tansanit Blue II Metallic'), false);
  assert.equal(PAINT_REFERENCE['São Paulo Yellow'].code, 'C4H');
  assert.equal(colorToSlug('São Paulo Yellow'), 'sao-paulo-yellow');
});

test('names BMW lists in German only use the German string (#93)', () => {
  assert.equal(PAINT_REFERENCE['Night Dusk Blue'].code, 'C7R');
  assert.equal(PAINT_REFERENCE['Frozen Isle of Man Green Metallic'].code, 'P92');
});

test('the "BMW Individual " and "M " prefixes and a trailing " Uni" are not part of a display name (#93)', () => {
  for (const name of Object.keys(BMW_COLORS)) {
    assert.doesNotMatch(name, /^BMW Individual /, name);
    assert.doesNotMatch(name, /^M /, name);
    assert.doesNotMatch(name, / Uni$/, name);
  }
});

test('unverified names stay as typed, are not merged, and carry a note (#93)', () => {
  const unverified = ['Mexico Blue', 'Atlantis Blue Metallic', 'Verde Ermes', 'Frozen Orange II', 'Snapper Rocks Blue', 'Sunset Orange', 'Malachite Green Metallic'];
  for (const name of unverified) {
    assert.ok(Object.hasOwn(BMW_COLORS, name), name);
    assert.equal(PAINT_REFERENCE[name].source, 'unverified', name);
    assert.ok(PAINT_REFERENCE[name].note, `${name} has a note`);
    assert.equal(canonicalColorName(name), name, name);
  }
  assert.match(PAINT_REFERENCE['Mexico Blue'].note ?? '', /Daytona Beach Blue/);
  assert.match(PAINT_REFERENCE['Mexico Blue'].noteUrl ?? '', /^https:\/\/www\.carpaints\.co\//);
  assert.equal(canonicalColorName('Malachite Green'), 'Malachite Green Metallic');
});

test('every listed color has a reference with a source, and the other way round (#93)', () => {
  assert.deepEqual(Object.keys(PAINT_REFERENCE).sort(), Object.keys(BMW_COLORS).sort());
  for (const [name, ref] of Object.entries(PAINT_REFERENCE)) {
    assert.ok(['bmw', 'archived', 'us-doc', 'unverified'].includes(ref.source), name);
    assert.match(ref.hex, /^#[0-9a-fA-F]{6}$/, name);
    assert.equal(BMW_COLORS[name], ref.hex, name);
    assert.ok(COLOR_FAMILY_MAP[name], `${name} has an explicit family`);
    if (ref.source === 'unverified') continue;
    assert.ok(ref.code, `${name} has a BMW code`);
    if (ref.source === 'archived' || ref.source === 'us-doc') {
      assert.match(ref.url ?? '', /^https:\/\//, `${name} cites its document`);
    }
  }
});

test('archived paints cite a Wayback page that opens in a browser (no raw id_ mode) (#93)', () => {
  const archived = Object.entries(PAINT_REFERENCE).filter(([, r]) => r.source === 'archived');
  assert.ok(archived.length >= 15, `${archived.length} archived paints`);
  for (const [name, ref] of archived) {
    assert.match(ref.url ?? '', /^https:\/\/web\.archive\.org\/web\/\d{14}\/https:\/\/individual\.bmw-m\.com\//, name);
  }
});

test('reference lookups use own keys only (#93)', () => {
  assert.equal(paintReference('constructor'), null);
  assert.equal(paintReference('Miami Blue')?.code, 'P5W');
  assert.equal(paintReference('Some New Color'), null);
});

test('unknown colors are still accepted as typed (#93)', () => {
  assert.equal(snapColorName('Some New Color'), 'Some New Color');
  assert.equal(canonicalColorName('Totally Custom Paint'), 'Totally Custom Paint');
});

// ---- alias invariants -----------------------------------------------------------------------

test('no alias is itself a listed color, by name or by slug (#93)', () => {
  const catalogSlugs = new Set(Object.keys(BMW_COLORS).map(colorToSlug));
  const catalogLower = new Set(Object.keys(BMW_COLORS).map((n) => n.toLowerCase()));
  for (const alias of Object.keys(COLOR_ALIASES)) {
    assert.equal(catalogLower.has(alias.toLowerCase()), false, alias);
    assert.equal(catalogSlugs.has(colorToSlug(alias)), false, `${alias} slug`);
  }
});

test('every alias points straight at a listed color, with no chains (#93)', () => {
  for (const [alias, target] of Object.entries(COLOR_ALIASES)) {
    assert.ok(Object.hasOwn(BMW_COLORS, target), `${alias} -> ${target}`);
    assert.equal(Object.hasOwn(COLOR_ALIASES, target), false, `${alias} -> ${target} is an alias`);
  }
});

test('paintNameSpellings lists the name plus every alias that points at it (#93)', () => {
  assert.deepEqual([...paintNameSpellings('Twilight Purple Pearl effect')].sort(), ['Twilight Purple', 'Twilight Purple Pearl effect']);
  assert.deepEqual([...paintNameSpellings('Santorin Blue II')].sort(), ['Santorin Blue II', 'Santorini Blue', 'Santorini Blue II']);
  assert.deepEqual([...paintNameSpellings('Miami Blue')], ['Miami Blue']);
  assert.deepEqual([...paintNameSpellings('Some New Color')], ['Some New Color']);
});

// ---- no build is orphaned -------------------------------------------------------------------

test('every paint name with builds on 2026-11-20 resolves to a listed color (#93)', () => {
  const counts = JSON.parse(readFileSync(new URL('./registry-paint-names.json', import.meta.url), 'utf8')) as Record<string, number>;
  const orphans = Object.keys(counts).filter((name) => !Object.hasOwn(BMW_COLORS, canonicalColorName(name)));
  assert.deepEqual(orphans, []);
  // One name per slug: merges must not leave two pages for one paint.
  const bySlug = new Map<string, Set<string>>();
  for (const name of Object.keys(counts)) {
    const canonical = canonicalColorName(name);
    const set = bySlug.get(colorToSlug(canonical)) ?? new Set<string>();
    set.add(canonical);
    bySlug.set(colorToSlug(canonical), set);
  }
  for (const [slug, names] of bySlug) assert.equal(names.size, 1, `${slug}: ${[...names].join(', ')}`);
});

test('every paint with builds that BMW lists keeps a BMW source; only the named seven are unverified (#93)', () => {
  const counts = JSON.parse(readFileSync(new URL('./registry-paint-names.json', import.meta.url), 'utf8')) as Record<string, number>;
  const unverified = new Set<string>();
  for (const name of Object.keys(counts)) {
    const canonical = canonicalColorName(name);
    if (PAINT_REFERENCE[canonical].source === 'unverified') unverified.add(canonical);
  }
  assert.deepEqual([...unverified].sort(), ['Atlantis Blue Metallic', 'Frozen Orange II', 'Malachite Green Metallic', 'Mexico Blue', 'Snapper Rocks Blue', 'Sunset Orange', 'Verde Ermes']);
});
