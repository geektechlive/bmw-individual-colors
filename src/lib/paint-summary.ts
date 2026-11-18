// Rank, tie note and one-line summary for a color page (#45, #67). Tied paints share a rank (1, 2, 3, 3, 5).
import type { ColorCount } from '../types';

export function rankOf(counts: readonly ColorCount[], color: string): number | null {
  const own = counts.find((c) => c.color === color);
  if (!own) return null;
  return counts.filter((c) => c.count > own.count).length + 1;
}

const tiedWith = (counts: readonly ColorCount[], color: string, count: number) =>
  counts.filter((c) => c.count === count && c.color !== color);

/** "Tied with 22 other paints" for the rank tile, or null when no other paint has the same count. */
export function rankNote(counts: readonly ColorCount[], color: string): string | null {
  const own = counts.find((c) => c.color === color);
  if (!own) return null;
  const k = tiedWith(counts, color, own.count).length;
  return k === 0 ? null : `Tied with ${k} other paint${k === 1 ? '' : 's'}`;
}

/** e.g. "12 builds are registered in Laguna Seca Blue, tied with Voodoo Blue. 2 paints have more." */
export function paintSummary(counts: readonly ColorCount[], color: string): string | null {
  const own = counts.find((c) => c.color === color);
  if (!own) return null;
  const n = own.count;
  const lead = `${n === 1 ? '1 build is' : `${n} builds are`} registered in ${color}`;
  const above = counts.filter((c) => c.count > n);
  const below = counts.filter((c) => c.count < n);
  const tied = tiedWith(counts, color, n);
  const who = tied.length === 1 ? tied[0].color : `${tied.length} other paints`;

  if (above.length === 0) {
    return tied.length === 0 ? `${lead}, more than any other paint.` : `${lead}, tied with ${who} for the most.`;
  }
  if (below.length === 0) {
    return tied.length === 0 ? `${lead}, fewer than any other paint.` : `${lead}, tied with ${who} for the fewest.`;
  }
  const tie = tied.length > 0 ? `, tied with ${who}` : '';
  return above.length === 1
    ? `${lead}${tie}. Only ${above[0].color} has more.`
    : `${lead}${tie}. ${above.length} paints have more.`;
}
