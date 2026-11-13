import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BMW_COLORS, COLOR_ALIASES, COLOR_FAMILY_MAP, aliasRedirectSlug, colorToSlug, getColorFamily, getColorHex, slugToColor } from '../../src/lib/colors';
import { snapColorName, normalizeTransmission, normalizeWheels, updateErrorMessage } from '../../src/lib/validation';

// ---- #36 duplicate on edit -----------------------------------------------------------------

test('an edit that duplicates another of the user’s builds gets a clear message (#36)', () => {
  assert.equal(updateErrorMessage({ code: '23505' }), 'You already have an entry for this exact build.');
});

test('other save errors keep the generic retry message (#36)', () => {
  assert.equal(updateErrorMessage({ code: '08006' }), 'Failed to save changes. Please try again.');
  assert.equal(updateErrorMessage({}), 'Failed to save changes. Please try again.');
});

// ---- #16 Miami Blue -------------------------------------------------------------

test('Miami Blue is a known color with its sourced hex and the Blues family (#16)', () => {
  // Porsche M5C, ordered through BMW Individual; hex from colors.stuttcars.com (structured data).
  assert.equal(BMW_COLORS['Miami Blue'], '#1BBFE8');
  assert.equal(getColorHex('Miami Blue'), '#1BBFE8');
  assert.equal(getColorFamily('Miami Blue'), 'Blues');
  assert.equal(slugToColor('miami-blue'), 'Miami Blue');
  assert.equal(snapColorName('miami blue'), 'Miami Blue');
});

// ---- #35 aliases on write, duplicate key --------------------------------------------

test('aliases are canonicalized on write, so one car cannot be stored under two names (#35)', () => {
  for (const [alias, canonical] of Object.entries(COLOR_ALIASES)) {
    assert.equal(snapColorName(alias), canonical, alias);
    assert.equal(snapColorName(alias.toUpperCase()), canonical, `${alias} upper`);
  }
});

test('alias names are not offered as separate colors (#35)', () => {
  for (const alias of Object.keys(COLOR_ALIASES)) {
    assert.equal(alias in BMW_COLORS, false, alias);
  }
});

test('the duplicate "Eridan Blue Metallic" key is gone; "Eridan Blue" remains (#35)', () => {
  assert.equal('Eridan Blue Metallic' in BMW_COLORS, false);
  assert.equal(BMW_COLORS['Eridan Blue'] !== undefined, true);
});

test('unknown colors are still accepted as typed (custom Individual colors)', () => {
  assert.equal(snapColorName('  Some   New Color '), 'Some New Color');
  assert.equal(snapColorName('ALL CAPS COLOR'), 'All Caps Color');
});

// ---- #37 alias URLs redirect -------------------------------------------------------------

test('alias color slugs point to their canonical color page (#37)', () => {
  assert.equal(aliasRedirectSlug('enzian-blue'), 'gentian-blue');
  assert.equal(aliasRedirectSlug('verde-british-racing'), 'british-racing-green');
  assert.equal(aliasRedirectSlug('daytona-violet-metallic'), 'daytona-violet');
  assert.equal(aliasRedirectSlug('ENZIAN-BLUE'), 'gentian-blue');
});

test('real color slugs and unknown slugs are not redirected (#37)', () => {
  assert.equal(aliasRedirectSlug('gentian-blue'), null);
  assert.equal(aliasRedirectSlug('miami-blue'), null);
  assert.equal(aliasRedirectSlug('not-a-color'), null);
});

// ---- slug round-trip and families for every color --------------------------------------

test('every color slug round-trips with no two colors sharing a slug (#35)', () => {
  const seen = new Map<string, string>();
  for (const name of Object.keys(BMW_COLORS)) {
    const slug = colorToSlug(name);
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, name);
    assert.equal(seen.has(slug), false, `${name} collides with ${seen.get(slug)} on ${slug}`);
    seen.set(slug, name);
    assert.equal(slugToColor(slug), name, name);
  }
});

test('every listed color has a valid hex and an explicit family (#35)', () => {
  for (const [name, hex] of Object.entries(BMW_COLORS)) {
    assert.match(hex, /^#[0-9a-fA-F]{6}$/, name);
    assert.ok(COLOR_FAMILY_MAP[name], `${name} has no COLOR_FAMILY_MAP entry`);
  }
});

// ---- existing normalizers (previously untested) -------------------------------------------

test('transmission normalizes to the two G8x options (validation)', () => {
  assert.equal(normalizeTransmission('8AT'), '8AT');
  assert.equal(normalizeTransmission('Automatic'), '8AT');
  assert.equal(normalizeTransmission('6MT'), '6MT');
  assert.equal(normalizeTransmission('manual'), '6MT');
  assert.equal(normalizeTransmission(''), null);
});

test('wheels normalize known spellings and pass empty as null (validation)', () => {
  assert.equal(normalizeWheels(''), null);
  assert.equal(normalizeWheels(null), null);
  assert.equal(typeof normalizeWheels('826M'), 'string');
});
