import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composite, contrastRatio, hexToRgb } from '../../src/lib/contrast';
import { TOKENS, TEXT_PAIRS, MIN_TEXT_CONTRAST, type TokenName } from '../../src/lib/design-tokens';

// ---- contrast math (#38) -------------------------------------------------------------

test('contrast of black on white is 21:1 and of a color on itself is 1:1', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(contrastRatio('#1c69d4', '#1c69d4'), 1);
});

test('contrast is symmetric', () => {
  assert.equal(contrastRatio('#a9b0ba', '#0b0d10'), contrastRatio('#0b0d10', '#a9b0ba'));
});

test('hexToRgb reads 3- and 6-digit hex in either case', () => {
  assert.deepEqual(hexToRgb('#fff'), [255, 255, 255]);
  assert.deepEqual(hexToRgb('#1C69D4'), [28, 105, 212]);
  assert.throws(() => hexToRgb('blue'));
});

test('composite lays a translucent color over an opaque one', () => {
  assert.equal(composite('#ffffff', 0.5, '#000000'), '#808080');
  assert.equal(composite('#ff0000', 0, '#0b0d10'), '#0b0d10');
  assert.equal(composite('#ff0000', 1, '#0b0d10'), '#ff0000');
});

// ---- design tokens (#38) ------------------------------------------------------------

test('every text-on-surface pair reaches 4.5:1, with translucent surfaces composited first', () => {
  const failures: string[] = [];
  for (const pair of TEXT_PAIRS) {
    const surface = pair.over
      ? composite(TOKENS[pair.surface], pair.alpha ?? 1, TOKENS[pair.over])
      : TOKENS[pair.surface];
    const ratio = contrastRatio(TOKENS[pair.text], surface);
    if (ratio < MIN_TEXT_CONTRAST) {
      failures.push(`${pair.text} on ${pair.surface}${pair.over ? ` over ${pair.over}` : ''}: ${ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('the CSS token file and the TypeScript tokens hold the same values', () => {
  const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const mismatches: string[] = [];
  for (const [name, value] of Object.entries(TOKENS) as [TokenName, string][]) {
    const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
    if (!match) mismatches.push(`--${name} missing from tokens.css`);
    else if (match[1].toLowerCase() !== value.toLowerCase()) mismatches.push(`--${name}: css ${match[1]} vs ts ${value}`);
  }
  assert.deepEqual(mismatches, []);
});

test('no font size in the type scale is under 11px', () => {
  const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const sizes = [...css.matchAll(/--t-[a-z0-9-]+:\s*([\d.]+)rem\s*;/g)].map((m) => Number(m[1]) * 16);
  assert.ok(sizes.length >= 5, 'type scale tokens are present');
  assert.deepEqual(sizes.filter((px) => px < 11), []);
});
