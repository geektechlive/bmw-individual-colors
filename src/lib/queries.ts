import 'server-only';

import { cache } from 'react';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { markRenderFailed } from './edge-cache';
import { createServerClient, createAdminClient } from './supabase';
import { BMW_COLORS, canonicalColorName, colorToSlug } from './colors';
import type { BmwEntry } from '../types';

// PostgREST caps a single response at 1000 rows. Page explicitly so a growing
// registry can never be silently truncated.
const PAGE_SIZE = 1000;

function flagRenderFailed(): void {
  try {
    markRenderFailed(getCloudflareContext().ctx);
  } catch {
    // Outside the Workers runtime (next dev, scripts) there is no edge cache.
  }
}

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
      // A degraded render must never be stored by the edge cache: Next has
      // usually committed a 200 already (RSC responses always do), so the
      // status code can't say so. Flag the request, then fail the render.
      console.error('getEntries error:', error);
      flagRenderFailed();
      throw new Error(`getEntries failed: ${error.message}`);
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

// Deduped per request only (the color page reads entries three times in one
// render). Cross-request caching is the edge cache in worker.ts, keyed on the
// database's data_version: a data cache here would let a render that follows
// an edit store pre-edit rows under the post-edit key.
export const getEntries = cache(getEntriesUncached);

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

/**
 * Entries that can be placed on the map. Derived from getEntries() so it shares
 * its paging (no silent 1000-row PostgREST cap) and its alias-color merge.
 */
export async function getLocationEntries(): Promise<BmwEntry[]> {
  const entries = await getEntries();
  return entries.filter((e) => e.location_lat != null && e.location_lng != null);
}

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
