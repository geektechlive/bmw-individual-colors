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

/** "2027 M3 Comp": the year and model on a phone row. */
export function carLabel(e: Pick<BmwEntry, 'model_year' | 'body_style' | 'competition'>): string {
  return `${e.model_year} ${modelLabel(e)}`;
}

const DEFAULT_FORUM = 'BimmerPost';

/**
 * The forum tag next to a username, or null for none. BimmerPost is where nearly every build
 * comes from, so it is not worth a tag; the stored value "Other" reads as "Other forum".
 */
export function forumTagLabel(sourceForum: string | null): string | null {
  if (!sourceForum || sourceForum === DEFAULT_FORUM) return null;
  return sourceForum === 'Other' ? 'Other forum' : sourceForum;
}

/** Line 2 of a phone row: "AWD · 8AT · 826M · Hampton Roads, Virginia", the country when there is no city or state. */
export function phoneSubline(
  e: Pick<BmwEntry, 'drivetrain' | 'transmission' | 'wheels' | 'location_city' | 'location_state' | 'location_country'>
): string {
  return [e.drivetrain, e.transmission, e.wheels, cityState(e) || e.location_country].filter(Boolean).join(' · ');
}
