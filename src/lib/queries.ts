import 'server-only';

import { unstable_cache } from 'next/cache';
import { createServerClient, createAdminClient } from './supabase';
import { BMW_COLORS, canonicalColorName, colorToSlug } from './colors';
import type { BmwEntry } from '../types';

// PostgREST caps a single response at 1000 rows. Page explicitly so a growing
// registry can never be silently truncated.
const PAGE_SIZE = 1000;

async function getEntriesUncached(): Promise<BmwEntry[]> {
  const supabase = createServerClient();
  const all: BmwEntry[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('bmwic_entries')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      // `id` is an arbitrary but stable tiebreaker. Without it, rows sharing a
      // created_at (bulk forum imports do) have no guaranteed order between
      // round trips and could be duplicated or skipped across page boundaries.
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('getEntries error:', error);
      return [];
    }

    const page = (data ?? []) as BmwEntry[];
    // Canonicalize alias color names in exactly one place so every downstream
    // count, matrix and slug lookup sees merged colors. Immutable copy.
    for (const row of page) {
      all.push({ ...row, ext_color: canonicalColorName(row.ext_color) });
    }

    if (page.length < PAGE_SIZE) break;
  }

  return all;
}

export const getEntries = unstable_cache(getEntriesUncached, ['entries'], {
  revalidate: 300,
  tags: ['entries'],
});

/**
 * All non-deleted entries whose canonical exterior color matches `colorName`.
 * Filters in memory over getEntries() so the alias merge stays consistent and
 * we reuse the already-cached full fetch instead of nesting another cache.
 */
export async function getEntriesByColor(colorName: string): Promise<BmwEntry[]> {
  const target = canonicalColorName(colorName);
  const entries = await getEntries();
  return entries.filter((e) => e.ext_color === target);
}

/**
 * Map a URL slug back to a canonical color name.
 * Prefers colors actually present in the registry, then falls back to the
 * static BMW_COLORS catalog. Returns null when nothing matches.
 */
export async function resolveColorSlug(slug: string): Promise<string | null> {
  const normalized = slug.toLowerCase();

  const entries = await getEntries();
  for (const name of new Set(entries.map((e) => e.ext_color))) {
    if (colorToSlug(name) === normalized) return name;
  }

  for (const name of Object.keys(BMW_COLORS)) {
    if (colorToSlug(name) === normalized) return canonicalColorName(name);
  }

  return null;
}

async function getLocationEntriesUncached(): Promise<BmwEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('bmwic_entries')
    .select('*')
    .is('deleted_at', null)
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null);

  if (error) {
    console.error('getLocationEntries error:', error);
    return [];
  }
  return (data ?? []) as BmwEntry[];
}

export const getLocationEntries = unstable_cache(
  getLocationEntriesUncached,
  ['location-entries'],
  { revalidate: 300, tags: ['entries'] }
);

/**
 * Soft-deleted entries, newest deletion first. Uses the admin client (which
 * bypasses RLS) and is deliberately NOT cached — moderation views must always
 * see the current state.
 */
export async function getDeletedEntries(): Promise<BmwEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bmwic_entries')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('getDeletedEntries error:', error);
    return [];
  }
  return (data ?? []) as BmwEntry[];
}
