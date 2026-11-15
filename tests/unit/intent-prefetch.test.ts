import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// #62: a plain <Link> prefetches as soon as it scrolls into view. The paint wall and
// /colors render 40-70 paint links, so one home view fired ~50 background renders
// (about half of all Worker CPU). Paint-page links use IntentLink, which prefetches
// only on hover, focus or touch.

const SRC = join(__dirname, '..', '..', 'src');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith('.tsx') ? [path] : [];
  });
}

test('no plain <Link> points at a paint page', () => {
  const offenders = tsxFiles(SRC).filter((file) =>
    /<Link\b[^>]*?href=\{`\/colors\/\$\{/.test(readFileSync(file, 'utf8')),
  );
  assert.deepEqual(offenders.map((f) => relative(SRC, f)), []);
});

test('IntentLink turns prefetch off until the visitor shows intent', () => {
  const source = readFileSync(join(SRC, 'components', 'IntentLink.tsx'), 'utf8');
  assert.match(source, /prefetch=\{active \? null : false\}/);
  for (const handler of ['onMouseEnter', 'onFocus', 'onTouchStart']) assert.match(source, new RegExp(handler));
});

test('paint-page links use IntentLink', () => {
  const files = tsxFiles(SRC).filter((file) => readFileSync(file, 'utf8').includes('/colors/${'));
  const linking = files.filter((file) => !file.includes('opengraph-image') && !file.includes(join('colors', '[slug]', 'page.tsx')));
  assert.ok(linking.length >= 5, `expected the 5 linking components, found ${linking.length}`);
  for (const file of linking) assert.match(readFileSync(file, 'utf8'), /<IntentLink\b/, relative(SRC, file));
});
