import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// #61: Next's hashed build files never change at a given URL, but Workers Static Assets
// serves them with max-age=0, must-revalidate, so every visit re-checked 25-30 of them.
// public/_headers (copied into the assets folder by OpenNext) marks them immutable.

function rules(): Map<string, string[]> {
  const text = readFileSync(join(__dirname, '..', '..', 'public', '_headers'), 'utf8');
  const map = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\s/.test(line)) current?.push(line.trim());
    else map.set(line.trim(), (current = []));
  }
  return map;
}

test('hashed Next build files are cached for a year as immutable', () => {
  const headers = rules().get('/_next/static/*');
  assert.ok(headers, 'no rule for /_next/static/*');
  assert.ok(headers.includes('Cache-Control: public, max-age=31536000, immutable'), headers.join(' | '));
});

test('no other path is marked immutable (public/ files keep their names across deploys)', () => {
  for (const [path, headers] of rules()) {
    if (path === '/_next/static/*') continue;
    assert.ok(!headers.some((h) => /immutable/i.test(h)), path);
  }
});
