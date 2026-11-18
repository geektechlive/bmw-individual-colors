// Pure, dependency-free aggregation helpers over registry entries.
//
// Everything here is a plain function of its arguments — no Supabase, no
// next/cache, no `server-only`. That is deliberate: Client Components
// (ReportsClient and the chart components) import from this module, so it must
// stay safe to bundle for the browser.

import { getColorHex } from './colors';
import { TOKENS } from './design-tokens';
import type { BmwEntry, ColorCount, Stats } from '../types';

export function computeStats(entries: BmwEntry[]): Stats {
  return {
    totalEntries: entries.length,
    totalColors: new Set(entries.map((e) => e.ext_color)).size,
    totalCountries: new Set(entries.map((e) => e.location_country).filter(Boolean)).size,
  };
}

export function computeColorCounts(entries: BmwEntry[]): ColorCount[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.ext_color, (map.get(e.ext_color) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([color, count]) => ({
      color,
      count,
      hex: getColorHex(color),
    }))
    .sort((a, b) => b.count - a.count);
}

export interface GrowthPoint {
  /** Label like "Aug 2023", for text. */
  month: string;
  /** UTC start of that month in ms, for a real time axis. */
  t: number;
  cumulative: number;
}

export function computeRegistryGrowth(entries: BmwEntry[]): GrowthPoint[] {
  const counts = new Map<number, number>();
  for (const e of entries) {
    const d = new Date(e.posted_at ?? e.created_at);
    // UTC, so the server render and the visitor's browser group a build into the same month.
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let cumulative = 0;
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => {
      cumulative += count;
      const month = new Date(t).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      return { month, t, cumulative };
    });
}

/** January 1 (UTC) of each year inside the span of the points: the readable axis ticks. */
export function growthYearTicks(points: readonly GrowthPoint[]): number[] {
  if (points.length === 0) return [];
  const last = points[points.length - 1].t;
  const ticks: number[] = [];
  for (let y = new Date(points[0].t).getUTCFullYear() + 1; Date.UTC(y, 0, 1) <= last; y++) {
    ticks.push(Date.UTC(y, 0, 1));
  }
  return ticks;
}

export function computeWheelCounts(entries: BmwEntry[]): ColorCount[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const w = e.wheels?.trim();
    if (w) map.set(w, (map.get(w) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([color, count]) => ({ color, count, hex: TOKENS['ink-3'] }))
    .sort((a, b) => b.count - a.count);
}

// Labels and cut-offs from the approved mockups (ADR 0016; owner confirmed 2026-11-14).
// A paint with no builds has no rarity ('' = no label; callers must not show an empty pill).
export function computeRarityLabel(count: number): string {
  if (count <= 0) return '';
  if (count >= 15) return 'Very common';
  if (count >= 6) return 'Common';
  if (count >= 3) return 'Uncommon';
  return 'Rare';
}
