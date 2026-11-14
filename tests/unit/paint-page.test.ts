import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, hexToRgb, composite } from '../../src/lib/contrast';
import { TOKENS, MIN_TEXT_CONTRAST } from '../../src/lib/design-tokens';
import { BMW_COLORS } from '../../src/lib/colors';
import { readablePaint, paintSurfaces, PAINT_WASH_ALPHA } from '../../src/lib/paint-accent';
import { rankOf, paintSummary } from '../../src/lib/paint-summary';

// ---- readable paint accent (#45) --------------------------------------------------------

const SURFACES = paintSurfaces('#1e4c8c');

test('the surfaces include the ground, the panel and the paint-tinted hero (composited)', () => {
  assert.ok(SURFACES.includes(TOKENS['bg']));
  assert.ok(SURFACES.includes(TOKENS['panel']));
  assert.ok(SURFACES.includes(composite('#1e4c8c', PAINT_WASH_ALPHA, TOKENS['bg'])));
});

for (const [name, hex] of [
  ['Black Blue (near black)', '#0d1a2e'],
  ['Twilight Purple', '#5a3a7a'],
  ['Imola Red', '#a51c1c'],
  ['Chalk (near white)', '#d8d4cc'],
  ['Frozen Black', '#1a1a1a'],
] as const) {
  test(`${name}: the accent reaches ${MIN_TEXT_CONTRAST}:1 on every surface it sits on`, () => {
    const accent = readablePaint(hex, paintSurfaces(hex));
    for (const s of paintSurfaces(hex)) {
      assert.ok(contrastRatio(accent, s) >= MIN_TEXT_CONTRAST, `${accent} on ${s}: ${contrastRatio(accent, s).toFixed(2)}`);
    }
  });
}

test('every catalog paint: hero text, paint ink and the pill all reach 4.5:1 on what they sit on', () => {
  const failures: string[] = [];
  for (const [name, hex] of Object.entries(BMW_COLORS)) {
    const surfaces = paintSurfaces(hex);
    const wash = composite(hex, PAINT_WASH_ALPHA, TOKENS['bg']);
    const ink = readablePaint(hex, surfaces);
    const pairs: [string, string, string][] = [
      ['ink on wash', TOKENS['ink'], wash],
      ['ink-2 on wash', TOKENS['ink-2'], wash],
      ['paint ink on wash', ink, wash],
      ['ground on paint ink (pill)', TOKENS['bg'], ink],
      ['ink on panel-2 (split)', TOKENS['ink'], TOKENS['panel-2']],
    ];
    for (const [label, fg, bg] of pairs) {
      const r = contrastRatio(fg, bg);
      if (r < MIN_TEXT_CONTRAST) failures.push(`${name}: ${label} ${r.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('a paint that already passes is returned unchanged', () => {
  assert.equal(readablePaint('#d8d4cc', paintSurfaces('#d8d4cc')), '#d8d4cc');
});

test('a dark paint is lightened, never darkened or shifted in hue order', () => {
  const [r0, g0, b0] = hexToRgb('#0d1a2e');
  const [r, g, b] = hexToRgb(readablePaint('#0d1a2e', paintSurfaces('#0d1a2e')));
  assert.ok(r >= r0 && g >= g0 && b >= b0);
  assert.ok(b > r, 'still reads as blue');
});

// ---- tied ranks and the one-line summary (#45) --------------------------------------------

const COUNTS = [
  { color: 'Twilight Purple', count: 26, hex: '#000000' },
  { color: 'San Marino Blue', count: 16, hex: '#000000' },
  { color: 'Laguna Seca Blue', count: 12, hex: '#000000' },
  { color: 'Voodoo Blue', count: 12, hex: '#000000' },
  { color: 'Frozen Dark Grey', count: 11, hex: '#000000' },
  { color: 'Velvet Blue', count: 1, hex: '#000000' },
];

test('tied paints share a rank, and the next rank skips', () => {
  assert.equal(rankOf(COUNTS, 'Twilight Purple'), 1);
  assert.equal(rankOf(COUNTS, 'Laguna Seca Blue'), 3);
  assert.equal(rankOf(COUNTS, 'Voodoo Blue'), 3);
  assert.equal(rankOf(COUNTS, 'Frozen Dark Grey'), 5);
});

test('a paint not in the counts has no rank', () => {
  assert.equal(rankOf(COUNTS, 'Nope'), null);
});

test('summary, second place: names the one paint with more (the approved mockup sentence)', () => {
  assert.equal(paintSummary(COUNTS, 'San Marino Blue'), '16 builds are registered in San Marino Blue. Only Twilight Purple has more.');
});

test('summary, first place', () => {
  assert.equal(paintSummary(COUNTS, 'Twilight Purple'), '26 builds are registered in Twilight Purple, more than any other paint.');
});

test('summary, tied for first', () => {
  const tied = [{ color: 'A', count: 5, hex: '' }, { color: 'B', count: 5, hex: '' }, { color: 'C', count: 1, hex: '' }];
  assert.equal(paintSummary(tied, 'A'), '5 builds are registered in A, tied with B for the most.');
  const three = [...tied, { color: 'D', count: 5, hex: '' }];
  assert.equal(paintSummary(three, 'A'), '5 builds are registered in A, tied with 2 other paints for the most.');
});

test('summary, lower down: counts the paints with more', () => {
  assert.equal(paintSummary(COUNTS, 'Voodoo Blue'), '12 builds are registered in Voodoo Blue. 2 paints have more.');
});

test('summary, a single build', () => {
  assert.equal(paintSummary(COUNTS, 'Velvet Blue'), '1 build is registered in Velvet Blue. 5 paints have more.');
});

test('summary, unknown paint is null', () => {
  assert.equal(paintSummary(COUNTS, 'Nope'), null);
});
