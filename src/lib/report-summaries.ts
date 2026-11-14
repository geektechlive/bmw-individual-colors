// One-line plain-words findings for the report charts (#41). Pure functions of the same
// data the charts get, so the text updates with the filters. No dependencies on React.

import type { BmwEntry, ColorCount } from '../types';
import type { FamilyYearPoint, GrowthPoint } from './analytics';

export const NO_BUILDS = 'No builds match these filters.';

const builds = (n: number) => `${n} ${n === 1 ? 'build' : 'builds'}`;
const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

/** Counts per key, biggest first; ties break alphabetically so the text is stable. */
function tally(keys: readonly string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** "Twilight Purple leads with 26 builds, then San Marino Blue with 16." */
export function rankedSummary(counts: readonly ColorCount[], noun: string): string {
  if (counts.length === 0) return NO_BUILDS;
  const [first, second] = counts;
  if (!second) return `${first.color} is the only ${noun}, with ${builds(first.count)}.`;
  const leaders = counts.filter((c) => c.count === first.count);
  if (leaders.length === 2) return `${first.color} and ${second.color} are tied at ${builds(first.count)}.`;
  if (leaders.length > 2) {
    return `${first.color} and ${leaders.length - 1} others are tied at ${builds(first.count)}.`;
  }
  const lead = noun === 'paint' ? `${first.color} leads` : `${first.color} is the most common ${noun}`;
  return `${lead} with ${builds(first.count)}, then ${second.color} with ${second.count}.`;
}

/** "Twilight Purple is 21% of builds. The top 5 paints make up 58%." */
export function shareSummary(counts: readonly ColorCount[]): string {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return NO_BUILDS;
  const lead = `${counts[0].color} is ${percent(counts[0].count, total)}% of builds.`;
  if (counts.length <= 5) return lead;
  const top5 = counts.slice(0, 5).reduce((sum, c) => sum + c.count, 0);
  return `${lead} The top 5 paints make up ${percent(top5, total)}%.`;
}

/** "62 M3 builds and 38 M4 builds. 71% are RWD." */
export function modelSummary(entries: readonly BmwEntry[]): string {
  if (entries.length === 0) return NO_BUILDS;
  const m3 = entries.filter((e) => e.body_style === 'M3').length;
  const m4 = entries.filter((e) => e.body_style === 'M4').length;
  const [drive, driveCount] = tally(entries.map((e) => e.drivetrain))[0];
  const model = (n: number, name: string) => `${n} ${name} ${n === 1 ? 'build' : 'builds'}`;
  return `${model(m3, 'M3')} and ${model(m4, 'M4')}. ${percent(driveCount, entries.length)}% are ${drive}.`;
}

function competitionShare(entries: readonly BmwEntry[], model: string): number | null {
  const own = entries.filter((e) => e.body_style === model);
  if (own.length === 0) return null;
  return percent(own.filter((e) => e.competition).length, own.length);
}

/** "The Competition package is on 50% of M3 builds and 100% of M4 builds." */
export function competitionSummary(entries: readonly BmwEntry[]): string {
  const m3 = competitionShare(entries, 'M3');
  const m4 = competitionShare(entries, 'M4');
  if (m3 === null && m4 === null) return NO_BUILDS;
  const head = 'The Competition package is on';
  if (m3 !== null && m4 !== null) return `${head} ${m3}% of M3 builds and ${m4}% of M4 builds.`;
  if (m3 !== null) return `${head} ${m3}% of M3 builds. There are no M4 builds here.`;
  return `${head} ${m4}% of M4 builds. There are no M3 builds here.`;
}

/** "The most common pairing is RWD with 6MT, in 40 of 100 builds." */
export function driveMixSummary(entries: readonly BmwEntry[]): string {
  if (entries.length === 0) return NO_BUILDS;
  const [pair, n] = tally(entries.map((e) => `${e.drivetrain} with ${e.transmission}`))[0];
  return `The most common pairing is ${pair}, in ${n} of ${builds(entries.length)}.`;
}

/** The paint that has the most builds in the most model years. */
export function trendSummary(entries: readonly BmwEntry[]): string {
  if (entries.length === 0) return NO_BUILDS;
  const years = [...new Set(entries.map((e) => e.model_year))].sort((a, b) => a - b);
  const leaders = years.map((y) => tally(entries.filter((e) => e.model_year === y).map((e) => e.ext_color))[0][0]);
  const [paint, wins] = tally(leaders)[0];
  if (years.length === 1) return `${paint} is the top paint in the only model year, ${years[0]}.`;
  if (wins === years.length) return `${paint} is the top paint in every model year.`;
  return `${paint} is the top paint in ${wins} of ${years.length} model years.`;
}

/** "Blues is the largest color family, with 80 builds (40%)." */
export function familySummary(rows: readonly FamilyYearPoint[]): string {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const [name, n] of Object.entries(row)) {
      if (name !== 'year') totals.set(name, (totals.get(name) ?? 0) + n);
    }
  }
  const all = [...totals.values()].reduce((sum, n) => sum + n, 0);
  if (all === 0) return NO_BUILDS;
  const [name, n] = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return `${name} is the largest color family, with ${builds(n)} (${percent(n, all)}%).`;
}

/** "The most common pairing is Twilight Purple with Black interior, in 9 builds." */
export function pairingSummary(entries: readonly BmwEntry[]): string {
  const withInterior = entries.filter((e) => e.interior_color);
  if (withInterior.length === 0) return NO_BUILDS;
  const [pair, n] = tally(withInterior.map((e) => `${e.ext_color} with ${e.interior_color} interior`))[0];
  return `The most common pairing is ${pair}, in ${builds(n)}.`;
}

/** "31 paints across 4 model years. Twilight Purple has the most builds, with 26." */
export function matrixSummary(entries: readonly BmwEntry[]): string {
  if (entries.length === 0) return NO_BUILDS;
  const paints = tally(entries.map((e) => e.ext_color));
  const years = new Set(entries.map((e) => e.model_year)).size;
  const paintText = `${paints.length} ${paints.length === 1 ? 'paint' : 'paints'}`;
  const yearText = `${years} model ${years === 1 ? 'year' : 'years'}`;
  return `${paintText} across ${yearText}. ${paints[0][0]} has the most builds, with ${paints[0][1]}.`;
}

/** "200 builds so far, 12 of them added in Nov 2026." */
export function growthSummary(points: readonly GrowthPoint[]): string {
  if (points.length === 0) return NO_BUILDS;
  const last = points[points.length - 1];
  const added = last.cumulative - (points.length > 1 ? points[points.length - 2].cumulative : 0);
  return `${builds(last.cumulative)} so far, ${added} of them added in ${last.month}.`;
}
