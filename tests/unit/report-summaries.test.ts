import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankedSummary,
  shareSummary,
  modelSummary,
  trendSummary,
  growthSummary,
  NO_BUILDS,
} from '../../src/lib/report-summaries';
import type { BmwEntry, ColorCount } from '../../src/types';

let seq = 0;
function entry(o: Partial<BmwEntry> = {}): BmwEntry {
  seq += 1;
  return {
    id: String(seq), created_at: '2026-01-15T00:00:00Z', model_year: 2023, body_style: 'M3',
    competition: false, drivetrain: 'RWD', transmission: '8AT', ext_color: 'Twilight Purple',
    interior_color: 'Black', interior_type: null, interior_seats: null, interior_leather: null,
    wheels: null, location_city: null, location_state: null, location_country: null,
    location_lat: null, location_lng: null, forum_username: null, source_forum: null,
    posted_at: null, flag_count: 0, edit_count: 0, last_edited_at: null, notes: null,
    user_submitted: false, deleted_at: null, ...o,
  };
}
const many = (n: number, o: Partial<BmwEntry>) => Array.from({ length: n }, () => entry(o));
const cc = (color: string, count: number): ColorCount => ({ color, count, hex: '#000000' });

test('rankedSummary names the leader and the runner up', () => {
  assert.equal(
    rankedSummary([cc('Twilight Purple', 26), cc('San Marino Blue', 16), cc('X', 2)], 'paint'),
    'Twilight Purple leads with 26 builds, then San Marino Blue with 16.',
  );
});
test('rankedSummary handles empty, single and tied leaders', () => {
  assert.equal(rankedSummary([], 'paint'), NO_BUILDS);
  assert.equal(rankedSummary([cc('A', 1)], 'paint'), 'A is the only paint, with 1 build.');
  assert.equal(rankedSummary([cc('A', 4), cc('B', 4), cc('C', 1)], 'paint'), 'A and B are tied at 4 builds.');
});
test('rankedSummary uses the noun for non-paint charts', () => {
  assert.equal(
    rankedSummary([cc('Black', 9), cc('Red', 3)], 'interior'),
    'Black is the most common interior with 9 builds, then Red with 3.',
  );
});

test('shareSummary gives the leader share and the top five share', () => {
  const counts = [cc('A', 50), cc('B', 20), cc('C', 10), cc('D', 10), cc('E', 5), cc('F', 5)];
  assert.equal(shareSummary(counts), 'A is 50% of builds. The top 5 paints make up 95%.');
  assert.equal(shareSummary([]), NO_BUILDS);
  assert.equal(shareSummary([cc('A', 3), cc('B', 1)]), 'A is 75% of builds.');
});

test('modelSummary counts models and names the most common drivetrain', () => {
  const es = [...many(3, { body_style: 'M3' }), ...many(1, { body_style: 'M4', drivetrain: 'AWD' })];
  assert.equal(modelSummary(es), '3 M3 builds and 1 M4 build. 75% are RWD.');
  assert.equal(modelSummary([]), NO_BUILDS);
});

const NO_LEADER = 'No paint clearly leads. The top spot is tied or changes from year to year.';

test('trendSummary says so when a year is tied instead of crowning the alphabetical first (#56)', () => {
  const es = [entry({ model_year: 2022, ext_color: 'A' }), entry({ model_year: 2022, ext_color: 'B' })];
  assert.equal(trendSummary(es), NO_LEADER);
});

test('trendSummary says so when every year has a different leader (#56)', () => {
  const es = [
    ...many(2, { model_year: 2022, ext_color: 'A' }),
    ...many(2, { model_year: 2023, ext_color: 'B' }),
    ...many(2, { model_year: 2024, ext_color: 'C' }),
  ];
  assert.equal(trendSummary(es), NO_LEADER);
});

test('trendSummary ignores a tied year when one paint still wins another (#56)', () => {
  const es = [
    ...many(2, { model_year: 2022, ext_color: 'A' }),
    entry({ model_year: 2023, ext_color: 'A' }), entry({ model_year: 2023, ext_color: 'B' }),
  ];
  assert.equal(trendSummary(es), 'A is the top paint in 1 of 2 model years.');
});

test('trendSummary names the paint that tops the most model years', () => {
  const es = [
    ...many(3, { model_year: 2022, ext_color: 'A' }), entry({ model_year: 2022, ext_color: 'B' }),
    ...many(2, { model_year: 2023, ext_color: 'A' }), entry({ model_year: 2023, ext_color: 'B' }),
    ...many(5, { model_year: 2024, ext_color: 'B' }),
  ];
  assert.equal(trendSummary(es), 'A is the top paint in 2 of 3 model years.');
  assert.equal(trendSummary([entry({ model_year: 2024, ext_color: 'B' })]), 'B is the top paint in the only model year, 2024.');
  assert.equal(
    trendSummary([...many(2, { model_year: 2022, ext_color: 'A' }), entry({ model_year: 2023, ext_color: 'A' })]),
    'A is the top paint in every model year.',
  );
  assert.equal(trendSummary([]), NO_BUILDS);
});

test('growthSummary gives the total and the latest month', () => {
  assert.equal(
    growthSummary([{ month: 'Jan 2026', t: Date.UTC(2026, 0, 1), cumulative: 10 }, { month: 'Feb 2026', t: Date.UTC(2026, 1, 1), cumulative: 14 }]),
    '14 builds so far, 4 of them added in Feb 2026.',
  );
  assert.equal(growthSummary([{ month: 'Jan 2026', t: Date.UTC(2026, 0, 1), cumulative: 1 }]), '1 build so far, 1 of them added in Jan 2026.');
  assert.equal(growthSummary([]), NO_BUILDS);
});
