// Rank and one-line summary for a color page (#45). Tied paints share a rank (1, 2, 3, 3, 5).
import type { ColorCount } from '../types';

export function rankOf(counts: readonly ColorCount[], color: string): number | null {
  const own = counts.find((c) => c.color === color);
  if (!own) return null;
  return counts.filter((c) => c.count > own.count).length + 1;
}

const builds = (n: number) => (n === 1 ? '1 build is' : `${n} builds are`);

/** e.g. "16 builds are registered in San Marino Blue. Only Twilight Purple has more." */
export function paintSummary(counts: readonly ColorCount[], color: string): string | null {
  const own = counts.find((c) => c.color === color);
  if (!own) return null;
  const lead = `${builds(own.count)} registered in ${color}`;
  const above = counts.filter((c) => c.count > own.count);

  if (above.length === 0) {
    const tied = counts.filter((c) => c.count === own.count && c.color !== color);
    if (tied.length === 0) return `${lead}, more than any other paint.`;
    if (tied.length === 1) return `${lead}, tied with ${tied[0].color} for the most.`;
    return `${lead}, tied with ${tied.length} other paints for the most.`;
  }
  if (above.length === 1) return `${lead}. Only ${above[0].color} has more.`;
  return `${lead}. ${above.length} paints have more.`;
}
