import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getColorHex, getColorFamily, canonicalColorName, ownValue, aliasRedirectSlug } from '../../src/lib/colors';
import { snapColorName } from '../../src/lib/validation';

// Paint names are free text from an anonymous form. Names that match built-in object keys
// ("constructor", "toString", "__proto__") must be treated as ordinary unknown paints,
// never resolve to JavaScript built-ins. canonicalColorName runs on every entry in
// getEntries(), so a function there would break every page that lists builds.

const BUILT_IN_NAMES = ['toString', 'constructor', 'Constructor', 'valueOf', '__proto__', 'hasOwnProperty', 'isPrototypeOf'];

for (const name of BUILT_IN_NAMES) {
  test(`"${name}" resolves to plain strings everywhere`, () => {
    assert.equal(typeof canonicalColorName(name), 'string');
    assert.match(getColorHex(name), /^#[0-9a-f]{6}$/i);
    assert.equal(typeof getColorFamily(name), 'string');
    assert.equal(typeof snapColorName(name), 'string');
  });
}

test('"toString" is not accepted as a catalog paint', () => {
  // It stays the user's text, like any unknown paint (not snapped to a catalog entry).
  assert.equal(snapColorName('toString'), 'toString');
  assert.equal(getColorFamily('toString'), 'Other');
});

test('built-in names are not alias redirects (/colors/constructor must 404, not redirect)', () => {
  for (const slug of ['constructor', 'tostring', '__proto__', 'valueof']) {
    assert.equal(aliasRedirectSlug(slug), null, slug);
  }
});

test('ownValue only reads own keys', () => {
  const map: Record<string, string> = { a: '1' };
  assert.equal(ownValue(map, 'a'), '1');
  assert.equal(ownValue(map, 'toString'), undefined);
  assert.equal(ownValue(map, 'constructor'), undefined);
});

test('real paints still resolve', () => {
  assert.equal(getColorHex('Twilight Purple'), '#5a3a7a');
  assert.equal(getColorFamily('Twilight Purple'), 'Purples');
  assert.equal(canonicalColorName('twilight purple'), 'Twilight Purple');
});
