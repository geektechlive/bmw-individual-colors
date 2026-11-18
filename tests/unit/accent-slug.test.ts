import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorToSlug, slugToColor } from '../../src/lib/colors';

// #75: accented paint names must transliterate into readable slugs instead of
// dropping the accented letter ("São Paulo Yellow" -> s-o-paulo-yellow).

test('colorToSlug transliterates accents instead of replacing them with dashes (#75)', () => {
  assert.equal(colorToSlug('São Paulo Yellow'), 'sao-paulo-yellow');
  assert.equal(colorToSlug('Étoile Blanche'), 'etoile-blanche');
  assert.equal(colorToSlug('Café'), 'cafe');
});

test('an accented name maps deterministically to its transliterated slug (#75)', () => {
  // Paint names are free text from anonymous submissions; the mapping must be
  // stable so the same name always produces the same slug on write and read.
  assert.equal(colorToSlug('São Paulo Yellow'), 'sao-paulo-yellow');
  assert.equal(colorToSlug('sao paulo yellow'), 'sao-paulo-yellow');
  assert.equal(slugToColor('sao-paulo-yellow'), null); // not a catalog paint
});

test('non-Latin scripts and blank input keep the existing hash/blank behavior (#75)', () => {
  assert.equal(colorToSlug('!!!'), colorToSlug('!!!'));
  assert.equal(colorToSlug('紫'), colorToSlug('紫'));
  assert.equal(colorToSlug('   '), '');
  assert.equal(colorToSlug('Twilight Purple'), 'twilight-purple');
});
