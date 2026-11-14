// Display strings for an entry, shared by the entries table and the phone cards (#42).

import type { BmwEntry } from '../types';

/** "Carbon, Merino Leather", or the interior type when there is no seat or leather detail. */
export function interiorDetail(
  e: Pick<BmwEntry, 'interior_seats' | 'interior_leather' | 'interior_type'>
): string | null {
  if (e.interior_seats || e.interior_leather) {
    return [e.interior_seats, e.interior_leather ? `${e.interior_leather} Leather` : null].filter(Boolean).join(', ');
  }
  return e.interior_type || null;
}

export function cityState(e: Pick<BmwEntry, 'location_city' | 'location_state'>): string {
  return [e.location_city, e.location_state].filter(Boolean).join(', ');
}

/** "Mar 5, 2026": the forum post date when known, else when it was added. UTC so server and browser agree. */
export function entryDate(e: Pick<BmwEntry, 'posted_at' | 'created_at'>): string {
  return new Date(e.posted_at ?? e.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function modelLabel(e: Pick<BmwEntry, 'body_style' | 'competition'>): string {
  return `${e.body_style}${e.competition ? ' Comp' : ''}`;
}
