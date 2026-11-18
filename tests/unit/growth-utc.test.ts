import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRegistryGrowth, growthYearTicks } from '../../src/lib/analytics';
import type { BmwEntry } from '../../src/types';

// Months are grouped in UTC so the server render and the browser agree (the reports summary
// is server-rendered, then hydrated in the visitor's timezone).

test('a build just after midnight UTC on Nov 1 counts in November in any timezone', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const entries = [
      { created_at: '2026-10-15T00:00:00Z', posted_at: null },
      { created_at: '2026-11-01T02:00:00Z', posted_at: null },
    ] as unknown as BmwEntry[];
    const growth = computeRegistryGrowth(entries);
    assert.deepEqual(growth.map((g) => g.month), ['Oct 2026', 'Nov 2026']);
  } finally {
    process.env.TZ = previous;
  }
});

const GAP_ENTRIES = [
  { created_at: '2023-08-20T10:00:00Z', posted_at: null },
  { created_at: '2026-02-03T10:00:00Z', posted_at: null },
] as unknown as BmwEntry[];

test('each growth point carries its UTC month start as a numeric timestamp', () => {
  const growth = computeRegistryGrowth(GAP_ENTRIES);
  assert.deepEqual(growth.map((g) => g.t), [Date.UTC(2023, 7, 1), Date.UTC(2026, 1, 1)]);
});

test('growthYearTicks gives one January tick per year inside the span, gap years included', () => {
  const ticks = growthYearTicks(computeRegistryGrowth(GAP_ENTRIES));
  assert.deepEqual(ticks, [2024, 2025, 2026].map((y) => Date.UTC(y, 0, 1)));
  assert.deepEqual(growthYearTicks([]), []);
});
