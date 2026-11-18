import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  browseColors, parseSortHash, sortHash, sortLabel, parseSortKey, SORT_SELECT_ORDER, SORT_KEYS,
  type BrowseColor,
} from '../../src/lib/colors-browse';

const c = (name: string, count: number, hex: string, family = 'Blues', finish: BrowseColor['finish'] = 'solid'): BrowseColor => ({
  name, slug: name.toLowerCase().replace(/ /g, '-'), hex, count, rarity: 'Common', family, finish,
});

const SAMPLE = [
  c('Zandvoort Blue', 5, '#1e4c8c'),
  c('Alpine White', 30, '#f4f4f4', 'Greys & Blacks'),
  c('Imola Red', 12, '#a51c1c', 'Reds & Oranges'),
  c('Frozen Grey', 5, '#7a7a7a', 'Greys & Blacks', 'frozen'),
];
const NONE = { family: null, finish: null, query: '' };
const names = (l: readonly BrowseColor[]) => l.map((x) => x.name);

// Unit (e), #70: the phone select and the desktop chips share one set of labels.
test('sort labels are the approved strings, in the select order', () => {
  assert.deepEqual(
    SORT_SELECT_ORDER.map((k) => sortLabel(k)),
    ['Most builds', 'Rarest', 'By color', 'Name, A to Z'],
  );
});

test('the select lists every sort key exactly once', () => {
  assert.deepEqual([...SORT_SELECT_ORDER].sort(), [...SORT_KEYS].sort());
});

test('a select value maps back to the same key, and the hash round-trips it', () => {
  for (const key of SORT_SELECT_ORDER) {
    assert.equal(parseSortKey(key), key);
    assert.equal(parseSortHash(sortHash(parseSortKey(key))), key);
  }
});

test('an unknown select value falls back to the default sort', () => {
  assert.equal(parseSortKey('constructor'), 'builds');
  assert.equal(parseSortKey(''), 'builds');
});

test('builds sort puts the most builds first, ties by name', () => {
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'builds' })), ['Alpine White', 'Imola Red', 'Frozen Grey', 'Zandvoort Blue']);
});

test('rarity sort puts the fewest builds first, ties by name', () => {
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'rarity' })), ['Frozen Grey', 'Zandvoort Blue', 'Imola Red', 'Alpine White']);
});

test('name sort is alphabetical', () => {
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'name' })), ['Alpine White', 'Frozen Grey', 'Imola Red', 'Zandvoort Blue']);
});

test('color sort goes red to blue, greys last', () => {
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'color' })), ['Imola Red', 'Zandvoort Blue', 'Alpine White', 'Frozen Grey']);
});

test('filters by family and finish', () => {
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'name', family: 'Greys & Blacks' })), ['Alpine White', 'Frozen Grey']);
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'name', finish: 'frozen' })), ['Frozen Grey']);
});

test('search ignores case and surrounding spaces', () => {
  assert.deepEqual(names(browseColors(SAMPLE, { ...NONE, sort: 'name', query: '  RED ' })), ['Imola Red']);
});

test('returns an empty list when nothing matches, and never changes the input', () => {
  const copy = JSON.stringify(SAMPLE);
  assert.deepEqual(browseColors(SAMPLE, { ...NONE, sort: 'name', query: 'zzz' }), []);
  assert.equal(JSON.stringify(SAMPLE), copy);
});

test('hash round-trips and falls back to builds', () => {
  assert.equal(parseSortHash('#sort=rarity'), 'rarity');
  assert.equal(parseSortHash('#sort=bogus'), 'builds');
  assert.equal(parseSortHash(''), 'builds');
  assert.equal(sortHash('color'), '#sort=color');
  assert.equal(sortHash('builds'), '');
});
