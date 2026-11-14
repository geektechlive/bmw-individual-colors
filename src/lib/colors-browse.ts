// Sorting, filtering and searching for the /colors page (#47). Pure, so it is unit tested.
import { sortByHue } from './hue-sort';
import type { Finish } from './paint-finish';

export interface BrowseColor {
  name: string;
  slug: string;
  hex: string;
  count: number;
  rarity: string;
  family: string;
  finish: Finish;
}

export const SORT_KEYS = ['builds', 'color', 'rarity', 'name'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = 'builds';

export interface BrowseOptions {
  sort: SortKey;
  family: string | null;
  finish: Finish | null;
  query: string;
}

const byName = (a: BrowseColor, b: BrowseColor) => a.name.localeCompare(b.name);

function sorted(items: readonly BrowseColor[], sort: SortKey): BrowseColor[] {
  switch (sort) {
    case 'color':
      return sortByHue(items);
    case 'rarity':
      return [...items].sort((a, b) => a.count - b.count || byName(a, b));
    case 'name':
      return [...items].sort(byName);
    default:
      return [...items].sort((a, b) => b.count - a.count || byName(a, b));
  }
}

export function browseColors(items: readonly BrowseColor[], opts: BrowseOptions): BrowseColor[] {
  const q = opts.query.trim().toLowerCase();
  const kept = items.filter(
    (c) =>
      (!opts.family || c.family === opts.family) &&
      (!opts.finish || c.finish === opts.finish) &&
      (!q || c.name.toLowerCase().includes(q)),
  );
  return sorted(kept, opts.sort);
}

/** Reads `#sort=rarity` style hashes; anything else is the default sort. */
export function parseSortHash(hash: string): SortKey {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('sort');
  return (SORT_KEYS as readonly string[]).includes(value ?? '') ? (value as SortKey) : DEFAULT_SORT;
}

/** The hash for a sort; the default sort needs none. */
export function sortHash(sort: SortKey): string {
  return sort === DEFAULT_SORT ? '' : `#sort=${sort}`;
}
