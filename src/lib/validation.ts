/**
 * Pure, server-safe validation + normalization for the entry submission form.
 *
 * No Supabase, no React — this module only reads a `FormData` and returns a
 * typed, normalized result (or a user-friendly error string). It is safe to
 * import from Server Actions, scripts, or tests.
 */

import { Country } from 'country-state-city';
import { BMW_COLORS } from './colors';

export interface EntryInput {
  model_year: number;
  body_style: 'M3' | 'M4';
  competition: boolean;
  drivetrain: 'RWD' | 'AWD';
  transmission: '8AT' | '6MT';
  ext_color: string;
  interior_color: string | null;
  interior_type: string | null;
  interior_seats: string | null;
  interior_leather: string | null;
  wheels: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string;
  forum_username: string;
  notes: string | null;
  source_forum: string;
}

export type ValidationResult =
  | { ok: true; value: EntryInput }
  | { ok: false; error: string };

/** Numeric/length caps shared by validation and normalization. */
export const ENTRY_LIMITS = {
  MODEL_YEAR_MIN: 2021,
  MODEL_YEAR_MAX_FUTURE_OFFSET: 2,
  EXT_COLOR_MAX: 60,
  FORUM_USERNAME_MIN: 2,
  FORUM_USERNAME_MAX: 40,
  NOTES_MAX: 500,
  INTERIOR_COLOR_MAX: 60,
  LOCATION_MAX: 80,
  WHEELS_MAX: 60,
} as const;

// Radio values actually rendered by EntryForm.tsx / EditEntryForm.tsx.
const FORUM_OPTIONS = new Set(['BimmerPost', 'M3Post', 'F80Post', 'Other']);
const DEFAULT_FORUM = 'BimmerPost';

const SEAT_OPTIONS = new Set(['Carbon Buckets', 'Comfort Seats']);
const LEATHER_OPTIONS = new Set(['Full', 'Extended']);

const US_ALIASES = new Set([
  'usa', 'us', 'u.s.', 'u.s.a.', 'united states of america', 'america',
]);
const UK_ALIASES = new Set(['uk', 'great britain', 'england']);

function field(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === 'string' ? raw : '';
}

function cap(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Normalizes a country string (full name, common alias, or 2-letter ISO
 * code) to the canonical `country-state-city` display name. Empty input
 * defaults to 'United States'; an unrecognized non-empty string passes
 * through unchanged.
 */
export function normalizeCountry(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').trim();
  if (!cleaned) return 'United States';

  const lower = cleaned.toLowerCase();
  if (US_ALIASES.has(lower)) return 'United States';
  if (UK_ALIASES.has(lower)) return 'United Kingdom';

  const allCountries = Country.getAllCountries();
  const byName = allCountries.find((c) => c.name.toLowerCase() === lower);
  if (byName) return byName.name;

  if (cleaned.length === 2) {
    const byIso = allCountries.find((c) => c.isoCode.toLowerCase() === lower);
    if (byIso) return byIso.name;
  }

  return cleaned;
}

/**
 * Normalizes a wheel style string to the canonical G80/G82-era set, porting
 * the community-spelling regex rules from `scripts/normalize-wheels.ts`.
 * Differs from that script only in its fallback: the literal "Other" (or
 * empty input) maps to `null` instead of being nullified via vague-pattern
 * detection, and an unrecognized-but-meaningful string passes through
 * (cleaned, capped) instead of collapsing to the literal string "Other".
 */
export function normalizeWheels(raw: string | null | undefined): string | null {
  const trimmedRaw = (raw ?? '').trim();
  if (!trimmedRaw || trimmedRaw.toLowerCase() === 'other') return null;

  const cleaned = trimmedRaw
    .replace(/,?\s*(w\/|with)\s*(red|blue|orange|yellow|black|white|gold|silver)?\s*(brake\s+)?calipers?.*/i, '')
    .replace(/,?\s*(red|blue|orange|yellow|black|white|gold|silver)\s+(brake\s+)?calipers?.*/i, '')
    .replace(/\s+black\s+wheels?$/i, '')
    .replace(/\s*\d+"\s*\/?\s*\d*"?/g, '')
    .replace(/&#34;/g, '')
    .replace(/^black\s+/i, '')
    .trim();

  if (!cleaned || cleaned.toLowerCase() === 'other') return null;

  const s = cleaned.toLowerCase().replace(/[-\s]+/g, '');

  if (/^826m?$/.test(s)) return '826M';
  if (/^826m(jet)?black$/.test(s)) return '826M';
  if (/^826mboblack$/.test(s)) return '826M';
  if (/^826mdoublespoke(black)?$/.test(s)) return '826M';
  if (/^826mdualspoke(black)?$/.test(s)) return '826M';
  if (/^826mblack(bi|double)(color|colour)/.test(s)) return '826M Bi-Color';
  if (/^826m(bi|double)(color|colour|spoke)/.test(s)) return '826M Bi-Color';
  if (/^bicolor826m$/.test(s)) return '826M Bi-Color';
  if (/^826mbicolor(black)?$/.test(s)) return '826M Bi-Color';

  if (/^825m$/.test(s)) return '825M';
  if (/^825m(jet)?black$/.test(s)) return '825M';
  if (/^825m(bi|bi)(color|colour)$/.test(s)) return '825M Bi-Color';
  if (/^bicolor825m$/.test(s)) return '825M Bi-Color';
  if (/^825msilver$/.test(s)) return '825M Silver';
  if (/^825m?orbitgr[ae]y$/.test(s)) return '825M Orbit Grey';
  if (/^925m?orbitgr[ae]y$/.test(s)) return '825M Orbit Grey'; // common typo
  if (/^825orbitgr[ae]y$/.test(s)) return '825M Orbit Grey';
  if (/^825bi(color|colour)$/.test(s)) return '825M Bi-Color';

  if (/^824m?(orbitgr[ae]y)?$/.test(s)) return '824M';
  if (/^827m/.test(s)) return '827M';
  if (/^930m/.test(s)) return '930M';
  if (/^963m/.test(s)) return '963M';

  if (/^1000m(gold|bronze|frozen)?.*(gold|bronze)?$/.test(s)) {
    return /gold|bronze/.test(s) ? '1000M Gold/Bronze' : '1000M';
  }

  // Too vague to be useful.
  if (/^\d{2,2}\/\d{2,2}$/.test(s)) return null; // "18/19" etc.
  if (/^[0-9"]+$/.test(s)) return null;

  return cap(cleaned, ENTRY_LIMITS.WHEELS_MAX);
}

/**
 * Normalizes free-text/legacy transmission values to '8AT' | '6MT'.
 * Returns null when the value can't be recognized.
 */
export function normalizeTransmission(raw: string | null | undefined): '8AT' | '6MT' | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['8at', 'automatic', 'auto', 'dct', '8-speed', '8 speed'].includes(s)) return '8AT';
  if (['6mt', 'manual', '6-speed', '6 speed'].includes(s)) return '6MT';
  return null;
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * Snaps a cleaned color string to its canonical `BMW_COLORS` key via a
 * case-insensitive exact match. When there's no match, returns the cleaned
 * string as-is unless the input was entirely lower- or upper-case, in which
 * case it's Title Cased.
 */
export function snapColorName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const match = Object.keys(BMW_COLORS).find((k) => k.toLowerCase() === cleaned.toLowerCase());
  if (match) return match;

  const isAllLower = cleaned !== cleaned.toUpperCase() && cleaned === cleaned.toLowerCase();
  const isAllUpper = cleaned !== cleaned.toLowerCase() && cleaned === cleaned.toUpperCase();
  if (isAllLower || isAllUpper) return toTitleCase(cleaned);

  return cleaned;
}

/**
 * Validates and normalizes a full entry submission (create or edit). Field
 * names match `EntryForm.tsx` / `EditEntryForm.tsx`. Returns the first
 * failing rule as a user-friendly error.
 */
export function validateEntryInput(formData: FormData): ValidationResult {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + ENTRY_LIMITS.MODEL_YEAR_MAX_FUTURE_OFFSET;

  const model_year = parseInt(field(formData, 'model_year'), 10);
  if (Number.isNaN(model_year)) {
    return { ok: false, error: 'Model year is required.' };
  }
  if (model_year < ENTRY_LIMITS.MODEL_YEAR_MIN || model_year > maxYear) {
    return { ok: false, error: `Model year must be between ${ENTRY_LIMITS.MODEL_YEAR_MIN} and ${maxYear}.` };
  }

  const bodyStyleRaw = field(formData, 'body_style');
  if (bodyStyleRaw !== 'M3' && bodyStyleRaw !== 'M4') {
    return { ok: false, error: 'Body style must be M3 or M4.' };
  }
  const body_style: 'M3' | 'M4' = bodyStyleRaw;

  const variant = field(formData, 'variant') || 'Competition';
  const competition = variant !== 'Base (RWD)';
  const drivetrain: 'RWD' | 'AWD' = variant === 'Competition xDrive' ? 'AWD' : 'RWD';

  let transmission: '8AT' | '6MT';
  if (competition) {
    transmission = '8AT';
  } else {
    const t = normalizeTransmission(field(formData, 'transmission'));
    if (!t) {
      return { ok: false, error: 'Transmission must be 8AT or 6MT.' };
    }
    transmission = t;
  }

  const extColorClean = cap(field(formData, 'ext_color').trim().replace(/\s+/g, ' '), ENTRY_LIMITS.EXT_COLOR_MAX);
  if (!extColorClean) {
    return { ok: false, error: 'Individual color is required.' };
  }
  const ext_color = snapColorName(extColorClean);

  const forum_username = field(formData, 'forum_username').trim();
  if (
    forum_username.length < ENTRY_LIMITS.FORUM_USERNAME_MIN ||
    forum_username.length > ENTRY_LIMITS.FORUM_USERNAME_MAX
  ) {
    return { ok: false, error: 'Forum username must be 2–40 characters.' };
  }

  const notesRaw = field(formData, 'notes').trim();
  if (notesRaw.length > ENTRY_LIMITS.NOTES_MAX) {
    return { ok: false, error: `Notes must be ${ENTRY_LIMITS.NOTES_MAX} characters or fewer.` };
  }
  const notes = notesRaw || null;

  const interiorColorClean = cap(field(formData, 'interior_color').trim(), ENTRY_LIMITS.INTERIOR_COLOR_MAX);
  const interior_color = interiorColorClean || null;

  const seatsRaw = field(formData, 'interior_seats').trim();
  const interior_seats = SEAT_OPTIONS.has(seatsRaw) ? seatsRaw : null;

  const leatherRaw = field(formData, 'interior_leather').trim();
  const interior_leather = LEATHER_OPTIONS.has(leatherRaw) ? leatherRaw : null;

  let interior_type: string | null = null;
  if (interior_seats === 'Carbon Buckets') {
    interior_type = 'Carbon Buckets';
  } else if (interior_leather) {
    interior_type = 'Full Leather';
  }

  const wheels = normalizeWheels(field(formData, 'wheels'));

  const location_city = cap(field(formData, 'location_city').trim(), ENTRY_LIMITS.LOCATION_MAX) || null;
  const location_state = cap(field(formData, 'location_state').trim(), ENTRY_LIMITS.LOCATION_MAX) || null;
  const location_country = normalizeCountry(
    field(formData, 'location_country_name') || field(formData, 'location_country')
  );

  const sourceForumRaw = field(formData, 'source_forum').trim();
  const source_forum = FORUM_OPTIONS.has(sourceForumRaw) ? sourceForumRaw : DEFAULT_FORUM;

  return {
    ok: true,
    value: {
      model_year,
      body_style,
      competition,
      drivetrain,
      transmission,
      ext_color,
      interior_color,
      interior_type,
      interior_seats,
      interior_leather,
      wheels,
      location_city,
      location_state,
      location_country,
      forum_username,
      notes,
      source_forum,
    },
  };
}
