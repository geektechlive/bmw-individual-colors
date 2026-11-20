import test from 'node:test';
import assert from 'node:assert/strict';
import { BMW_COLORS, COLOR_ALIASES, colorToSlug, slugToColor } from '../../src/lib/colors';
import { readFileSync } from 'node:fs';
import { LEGACY_SLUGS, legacySlugRedirect, legacySlugTarget, oldColorToSlug } from '../../src/lib/legacy-slugs';
import { PAINT_SLUG_REDIRECTS } from '../../src/lib/paint-redirects';

// ---- #75 accents are transliterated in slugs ---------------------------------------------

test('colorToSlug transliterates accents instead of dropping the letter (#75)', () => {
  assert.equal(colorToSlug('São Paulo Yellow'), 'sao-paulo-yellow');
  assert.equal(colorToSlug('Sao Paulo Yellow'), 'sao-paulo-yellow');
  assert.equal(colorToSlug('Café Noir'), 'cafe-noir');
});

test('plain ASCII names and the hash fallback are unchanged (#75, #55)', () => {
  assert.equal(colorToSlug('Miami Blue'), 'miami-blue');
  assert.match(colorToSlug('!!!'), /^paint-[0-9a-f]{8}$/);
  assert.equal(colorToSlug(''), '');
});

test('slugToColor still resolves catalog slugs (#75)', () => {
  assert.equal(slugToColor('miami-blue'), 'Miami Blue');
});

// ---- the old slugs --------------------------------------------------------------------------

test('every catalog and alias name whose slug changed has a legacy redirect (#75)', () => {
  const names = [...Object.keys(BMW_COLORS), ...Object.keys(COLOR_ALIASES)];
  for (const name of names) {
    const old = oldColorToSlug(name);
    const next = colorToSlug(name);
    if (old !== next) assert.equal(LEGACY_SLUGS[old], next, `${name}: ${old} -> ${next}`);
  }
});

test('the registry paint São Paulo Yellow keeps its old slug working (#75)', () => {
  assert.equal(oldColorToSlug('São Paulo Yellow'), 's-o-paulo-yellow');
  assert.equal(legacySlugTarget('s-o-paulo-yellow'), 'sao-paulo-yellow');
  assert.equal(legacySlugTarget('S-O-Paulo-Yellow'), 'sao-paulo-yellow');
});

test('legacy lookups use own keys only (#75)', () => {
  for (const slug of ['constructor', '__proto__', 'toString', 'miami-blue', 'sao-paulo-yellow']) {
    assert.equal(legacySlugTarget(slug), null, slug);
  }
});

test('slugToColor resolves a legacy slug to the same paint as the new one (#75)', () => {
  for (const [old, next] of Object.entries(LEGACY_SLUGS)) {
    assert.equal(slugToColor(old), slugToColor(next), old);
  }
});

// ---- the early redirect ---------------------------------------------------------------------

const url = (path: string) => `https://mcolors.example/${path}`;

test('the old page URL redirects to the new slug and keeps the query string (#75)', () => {
  assert.equal(
    legacySlugRedirect(new Request(url('colors/s-o-paulo-yellow?a=1&b=2'))),
    'https://mcolors.example/colors/sao-paulo-yellow?a=1&b=2'
  );
  assert.equal(
    legacySlugRedirect(new Request(url('colors/s-o-paulo-yellow'))),
    'https://mcolors.example/colors/sao-paulo-yellow'
  );
});

test('the old OG card URL redirects too (#75)', () => {
  assert.equal(
    legacySlugRedirect(new Request(url('colors/s-o-paulo-yellow/opengraph-image?x=1'))),
    'https://mcolors.example/colors/sao-paulo-yellow/opengraph-image?x=1'
  );
});

test('other URLs and methods are not redirected (#75)', () => {
  assert.equal(legacySlugRedirect(new Request(url('colors/sao-paulo-yellow'))), null);
  assert.equal(legacySlugRedirect(new Request(url('colors/miami-blue'))), null);
  assert.equal(legacySlugRedirect(new Request(url('colors/s-o-paulo-yellow/extra'))), null);
  assert.equal(legacySlugRedirect(new Request(url('entries?x=s-o-paulo-yellow'))), null);
  assert.equal(legacySlugRedirect(new Request(url('colors/s-o-paulo-yellow'), { method: 'POST' })), null);
});

// ---- alias slugs answer in the Worker too (#89, #93) ------------------------------------------

test('an old name URL (page and OG card) redirects before the Next server loads (#89)', () => {
  assert.equal(
    legacySlugRedirect(new Request(url('colors/twilight-purple?a=1'))),
    'https://mcolors.example/colors/twilight-purple-pearl-effect?a=1'
  );
  assert.equal(
    legacySlugRedirect(new Request(url('colors/ENZIAN-BLUE/opengraph-image'))),
    'https://mcolors.example/colors/gentian-blue/opengraph-image'
  );
  assert.equal(
    legacySlugRedirect(new Request(url('colors/santorini-blue'), { method: 'HEAD' })),
    'https://mcolors.example/colors/santorin-blue-ii'
  );
});

test('the Worker redirect table is exactly the alias table, slug for slug (#89)', () => {
  const derived = Object.fromEntries(Object.entries(COLOR_ALIASES).map(([a, c]) => [colorToSlug(a), colorToSlug(c)]));
  assert.deepEqual({ ...PAINT_SLUG_REDIRECTS }, derived);
});

test('no redirect target is itself redirected, and every target is a listed color (#89)', () => {
  const listed = new Set(Object.keys(BMW_COLORS).map(colorToSlug));
  for (const [from, to] of Object.entries(PAINT_SLUG_REDIRECTS)) {
    assert.equal(Object.hasOwn(PAINT_SLUG_REDIRECTS, to), false, `${from} -> ${to}`);
    assert.equal(Object.hasOwn(LEGACY_SLUGS, to), false, `${from} -> ${to}`);
    assert.ok(listed.has(to), `${from} -> ${to}`);
  }
});

test('current paint pages are never redirected (#89)', () => {
  for (const name of Object.keys(BMW_COLORS)) {
    assert.equal(legacySlugRedirect(new Request(url(`colors/${colorToSlug(name)}`))), null, name);
  }
});

test('legacy-slugs.ts imports only the generated redirect table, never the catalog (#89)', () => {
  const source = readFileSync(new URL('../../src/lib/legacy-slugs.ts', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/^import .* from '(.+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./paint-redirects']);
  const table = readFileSync(new URL('../../src/lib/paint-redirects.ts', import.meta.url), 'utf8');
  assert.equal(/^import /m.test(table), false);
});
