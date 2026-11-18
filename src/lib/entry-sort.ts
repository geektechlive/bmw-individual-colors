// The sort select on phones (#69). Phones have no column headers, so one select offers the
// existing sort keys; the direction is part of the year options only.

import type { BmwEntry } from '../types';

export type SortKey = keyof Pick<
  BmwEntry,
  'ext_color' | 'model_year' | 'body_style' | 'drivetrain' | 'interior_color' | 'location_state' | 'forum_username'
>;
export type SortDir = 'asc' | 'desc';

export interface SortChoice {
  id: string;
  label: string;
  key: SortKey;
  dir: SortDir;
}

export const SORT_CHOICES: readonly SortChoice[] = [
  { id: 'year-desc', label: 'Year, newest first', key: 'model_year', dir: 'desc' },
  { id: 'year-asc', label: 'Year, oldest first', key: 'model_year', dir: 'asc' },
  { id: 'color', label: 'Color, A to Z', key: 'ext_color', dir: 'asc' },
  { id: 'color-desc', label: 'Color, Z to A', key: 'ext_color', dir: 'desc' },
  { id: 'model', label: 'Model', key: 'body_style', dir: 'asc' },
  { id: 'drive', label: 'Drive', key: 'drivetrain', dir: 'asc' },
  { id: 'interior', label: 'Interior', key: 'interior_color', dir: 'asc' },
  { id: 'location', label: 'Location', key: 'location_state', dir: 'asc' },
  { id: 'forum', label: 'Forum user', key: 'forum_username', dir: 'asc' },
];

export function choiceById(id: string): SortChoice | undefined {
  return SORT_CHOICES.find((c) => c.id === id);
}

/**
 * The option to show for the current sort. The desktop headers can reach states the list
 * has no option for (Model, descending): those get a synthesized "<label>, reversed" option
 * so the select never claims an order it isn't in. EntryTable adds it to the select.
 */
export function choiceFor(key: SortKey, dir: SortDir): SortChoice {
  const exact = SORT_CHOICES.find((c) => c.key === key && c.dir === dir);
  if (exact) return exact;
  const base = SORT_CHOICES.find((c) => c.key === key) ?? SORT_CHOICES[0];
  return { id: `${base.id}-${dir}`, label: `${base.label}, reversed`, key, dir };
}
