// Pure helpers for the home page: the facts panel and the paint wall (#46).
// Plain functions of the data the page already loads, so the edge-cached page costs no extra CPU.
import { getColorFamily } from './colors';
import { sortByHue } from './hue-sort';
import type { BmwEntry, ColorCount } from '../types';

/** A paint with this many builds or fewer counts as rare. */
const RARE_MAX_BUILDS = 2;

/** The paint with the most builds. On a tie the first one in the given order wins. */
export function mostRegistered(counts: readonly ColorCount[]): ColorCount | null {
  return counts.reduce<ColorCount | null>((best, c) => (best && best.count >= c.count ? best : c), null);
}

/** The most recently added entry, whatever order the list arrives in. */
export function newestEntry(entries: readonly BmwEntry[]): BmwEntry | null {
  return entries.reduce<BmwEntry | null>(
    (best, e) => (best && new Date(best.created_at) >= new Date(e.created_at) ? best : e),
    null,
  );
}

export function rarePaintCount(counts: readonly ColorCount[]): number {
  return counts.filter((c) => c.count <= RARE_MAX_BUILDS).length;
}

/** The `limit` paints with the most builds (ties broken by name), ordered by hue. */
export function topPaintsByHue(counts: readonly ColorCount[], limit: number): ColorCount[] {
  const top = [...counts]
    .sort((a, b) => b.count - a.count || a.color.localeCompare(b.color))
    .slice(0, limit);
  return sortByHue(top);
}

export interface FamilyTick {
  family: string;
  /** Where the family starts along the wall, 0 to 1 of all builds on the wall. */
  start: number;
  /** The family's share of all builds on the wall, 0 to 1. */
  share: number;
}

/** One tick per run of same-family paints in a hue-ordered wall, at the run's real start. */
export function familyTicks(wall: readonly ColorCount[]): FamilyTick[] {
  const total = wall.reduce((sum, p) => sum + p.count, 0);
  if (total === 0) return [];
  const ticks: Array<{ family: string; startCount: number; count: number }> = [];
  let run = 0;
  for (const p of wall) {
    const family = getColorFamily(p.color);
    const last = ticks[ticks.length - 1];
    if (last && last.family === family) {
      ticks[ticks.length - 1] = { ...last, count: last.count + p.count };
    } else {
      ticks.push({ family, startCount: run, count: p.count });
    }
    run += p.count;
  }
  return ticks.map((t) => ({ family: t.family, start: t.startCount / total, share: t.count / total }));
}
