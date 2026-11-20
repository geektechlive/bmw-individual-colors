import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintSourceLine, BMW_PAINT_LIST_URL } from '../../src/lib/paint-source';

// The source line on every paint page (#93).

test('a paint from the BMW Individual list shows its code and cites the public page', () => {
  const line = paintSourceLine('Twilight Purple Pearl effect');
  assert.equal(line.verified, true);
  assert.equal(line.code, 'P28');
  assert.equal(line.sourceLabel, 'BMW Individual');
  assert.equal(line.sourceUrl, BMW_PAINT_LIST_URL);
  assert.equal(BMW_PAINT_LIST_URL, 'https://individual.bmw-m.com/en-US/colors');
  assert.equal(line.note, null);
});

test('a paint BMW has dropped cites its archived visualizer page', () => {
  const line = paintSourceLine('Aegean Blue Metallic');
  assert.equal(line.verified, true);
  assert.equal(line.code, '336');
  assert.equal(line.sourceLabel, 'BMW visualizer, archived');
  assert.match(line.sourceUrl ?? '', /^https:\/\/web\.archive\.org\/web\/\d{14}\//);
});

test('C3Z cites the BMW US ordering guide, not the visualizer spelling', () => {
  const line = paintSourceLine('Tanzanite Blue II Metallic');
  assert.equal(line.code, 'C3Z');
  assert.match(line.sourceLabel ?? '', /Ordering Guide/);
  assert.match(line.sourceUrl ?? '', /^https:\/\//);
});

test('an unverified paint says so plainly and links its note source', () => {
  const line = paintSourceLine('Mexico Blue');
  assert.equal(line.verified, false);
  assert.equal(line.code, null);
  assert.equal(line.sourceLabel, null);
  assert.equal(line.statement, "Not in BMW's paint list; name as owners gave it.");
  assert.match(line.note ?? '', /Reported renamed by BMW to Daytona Beach Blue/);
  assert.match(line.noteUrl ?? '', /carpaints\.co/);
});

test('a name nobody has researched is unverified with no note', () => {
  const line = paintSourceLine('Some New Color');
  assert.equal(line.verified, false);
  assert.equal(line.statement, "Not in BMW's paint list; name as owners gave it.");
  assert.equal(line.note, null);
  assert.equal(line.noteUrl, null);
});

test('built-in property names do not look like paints', () => {
  assert.equal(paintSourceLine('constructor').verified, false);
  assert.equal(paintSourceLine('toString').code, null);
});
