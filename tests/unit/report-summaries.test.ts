import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankedSummary,
  shareSummary,
  modelSummary,
  competitionSummary,
  driveMixSummary,
  trendSummary,
  familySummary,
  pairingSummary,
  matrixSummary,
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

test('competitionSummary reports the share per model', () => {
  const es = [
    entry({ body_style: 'M3', competition: true }), entry({ body_style: 'M3' }),
    entry({ body_style: 'M4', competition: true }),
  ];
  assert.equal(competitionSummary(es), 'The Competition package is on 50% of M3 builds and 100% of M4 builds.');
  assert.equal(
    competitionSummary([entry({ body_style: 'M3', competition: true })]),
    'The Competition package is on 100% of M3 builds. There are no M4 builds here.',
  );
  assert.equal(competitionSummary([]), NO_BUILDS);
});

test('driveMixSummary names the most common drivetrain and gearbox pair', () => {
  const es = [...many(3, { drivetrain: 'RWD', transmission: '6MT' }), entry({ drivetrain: 'AWD', transmission: '8AT' })];
  assert.equal(driveMixSummary(es), 'The most common pairing is RWD with 6MT, in 3 of 4 builds.');
  assert.equal(driveMixSummary([]), NO_BUILDS);
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

test('familySummary names the biggest color family', () => {
  const rows = [
    { year: 2022, Blues: 4, Greens: 1, 'Reds & Oranges': 0, Yellows: 0, Purples: 2, 'Greys & Blacks': 1, Other: 0 },
    { year: 2023, Blues: 4, Greens: 0, 'Reds & Oranges': 0, Yellows: 0, Purples: 0, 'Greys & Blacks': 0, Other: 0 },
  ];
  assert.equal(familySummary(rows), 'Blues is the largest color family, with 8 builds (67%).');
  assert.equal(familySummary([]), NO_BUILDS);
});

test('pairingSummary names the most common exterior and interior pairing', () => {
  const es = [...many(3, { ext_color: 'A', interior_color: 'Red' }), entry({ ext_color: 'B', interior_color: 'Black' }), entry({ interior_color: null })];
  assert.equal(pairingSummary(es), 'The most common pairing is A with Red interior, in 3 builds.');
  assert.equal(pairingSummary([entry({ interior_color: null })]), NO_BUILDS);
});

test('matrixSummary counts paints and model years', () => {
  const es = [entry({ ext_color: 'A', model_year: 2022 }), entry({ ext_color: 'B', model_year: 2023 }), entry({ ext_color: 'B', model_year: 2023 })];
  assert.equal(matrixSummary(es), '2 paints across 2 model years. B has the most builds, with 2.');
  assert.equal(matrixSummary([entry({ ext_color: 'A', model_year: 2022 })]), '1 paint across 1 model year. A has the most builds, with 1.');
  assert.equal(matrixSummary([]), NO_BUILDS);
});

test('growthSummary gives the total and the latest month', () => {
  assert.equal(
    growthSummary([{ month: 'Jan 2026', cumulative: 10 }, { month: 'Feb 2026', cumulative: 14 }]),
    '14 builds so far, 4 of them added in Feb 2026.',
  );
  assert.equal(growthSummary([{ month: 'Jan 2026', cumulative: 1 }]), '1 build so far, 1 of them added in Jan 2026.');
  assert.equal(growthSummary([]), NO_BUILDS);
});
