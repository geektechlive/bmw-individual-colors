// Pure helpers for the home page: the facts panel, the paint wall and the single-build row (#46, #68).
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

/** Every paint, ordered by hue: the order of the wall. */
export function wallPaintsByHue<T extends ColorCount>(counts: readonly T[]): T[] {
  return sortByHue(counts);
}

export interface WallRun<T extends ColorCount = ColorCount> {
  family: string;
  /** The run's total builds: the weight of its tick and of its strip row. */
  total: number;
  paints: T[];
}

/** Neighbouring same-family paints of a hue-ordered wall, grouped into runs. */
export function wallRuns<T extends ColorCount>(wall: readonly T[]): WallRun<T>[] {
  const runs: WallRun<T>[] = [];
  for (const p of wall) {
    const family = getColorFamily(p.color);
    const last = runs[runs.length - 1];
    if (last && last.family === family) {
      runs[runs.length - 1] = { ...last, total: last.total + p.count, paints: [...last.paints, p] };
    } else {
      runs.push({ family, total: p.count, paints: [p] });
    }
  }
  return runs;
}

/** The paints with exactly one build, in hue order. */
export function singleBuildPaints<T extends ColorCount>(counts: readonly T[]): T[] {
  return sortByHue(counts.filter((c) => c.count === 1));
}

export function singleBuildLine(n: number): string {
  return n === 1
    ? '1 paint has one build registered so far.'
    : `${n} paints have one build registered so far.`;
}
