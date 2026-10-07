'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../lib/supabase';
import { EDIT_TOKEN_TTL_MS, generateEditToken, isAdminToken, timingSafeEqual } from '../lib/edit-token';
import { verifyTurnstile } from '../lib/turnstile';
import { validateEntryInput, type EntryInput } from '../lib/validation';
import { FRESH_COOKIE, FRESH_COOKIE_MAX_AGE_S } from '../lib/edge-cache';

interface FormState {
  error?: string;
  duplicate?: boolean;
  duplicateInfo?: string;
}

interface VerifyState {
  error?: string;
}

const GEOCODE_USER_AGENT = 'bmw-individual-colors/1.0';

interface Coords {
  location_lat: number | null;
  location_lng: number | null;
}

const NO_COORDS: Coords = { location_lat: null, location_lng: null };

/**
 * Purge every cached surface that renders registry entries.
 * Called after each successful mutation, and always BEFORE any redirect()
 * (redirect throws, so nothing after it runs).
 */
async function purgeEntryCaches(): Promise<void> {
  // The edge cache (worker.ts) invalidates itself: a Postgres trigger bumps
  // bmwic_meta.data_version on every write. Workers re-read that version at
  // most every few seconds, so the person who just made the change carries a
  // short-lived cookie that bypasses the edge cache until every Worker has
  // caught up — they never see their own edit missing.
  (await cookies()).set(FRESH_COOKIE, '1', {
    maxAge: FRESH_COOKIE_MAX_AGE_S,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  revalidatePath('/');
  revalidatePath('/entries');
  revalidatePath('/map');
  revalidatePath('/colors');
  revalidatePath('/reports');
  revalidatePath('/colors/[slug]', 'page');
}

/** Best-effort forward geocode via Nominatim. Never throws. */
async function geocode(
  city: string | null,
  state: string | null,
  country: string
): Promise<Coords> {
  if (!city && !state) return NO_COORDS;
  try {
    const q = [city, state, country].filter(Boolean).join(',');
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'User-Agent': GEOCODE_USER_AGENT } }
    );
    if (!geoRes.ok) {
      console.warn('Geocoding failed: HTTP', geoRes.status);
      return NO_COORDS;
    }
    const geoData = (await geoRes.json()) as Array<{ lat: string; lon: string }>;
    if (geoData.length > 0) {
      return {
        location_lat: parseFloat(geoData[0].lat),
        location_lng: parseFloat(geoData[0].lon),
      };
    }
  } catch (e) {
    console.warn('Geocoding failed:', e);
  }
  return NO_COORDS;
}

/** Columns shared by insert and update. Ownership (`forum_username`) is not editable. */
function toRowFields(v: EntryInput) {
  return {
    model_year: v.model_year,
    body_style: v.body_style,
    competition: v.competition,
    drivetrain: v.drivetrain,
    transmission: v.transmission,
    ext_color: v.ext_color,
    interior_color: v.interior_color,
    interior_type: v.interior_type,
    interior_seats: v.interior_seats,
    interior_leather: v.interior_leather,
    wheels: v.wheels,
    location_city: v.location_city,
    location_state: v.location_state,
    location_country: v.location_country,
    source_forum: v.source_forum,
    notes: v.notes,
  };
}

export async function submitEntry(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // ── Turnstile verification ────────────────────────────────────────────────
  const token = formData.get('cf-turnstile-response') as string | null;
  if (!token) {
    return { error: 'Please complete the bot verification.' };
  }
  if (!(await verifyTurnstile(token))) {
    return { error: 'Bot verification failed. Please try again.' };
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const parsed = validateEntryInput(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const value = parsed.value;

  // ── Geocode via Nominatim ─────────────────────────────────────────────────
  const coords = await geocode(value.location_city, value.location_state, value.location_country);

  const supabase = createAdminClient();

  // ── Duplicate check ───────────────────────────────────────────────────────
  const forceSubmit = formData.get('force_submit') === '1';
  if (!forceSubmit) {
    const { data: existing } = await supabase
      .from('bmwic_entries')
      .select('id')
      .eq('forum_username', value.forum_username)
      .eq('ext_color', value.ext_color)
      .eq('model_year', value.model_year)
      .eq('body_style', value.body_style)
      .eq('drivetrain', value.drivetrain)
      .is('deleted_at', null)
      .limit(1);
    if (existing && existing.length > 0) {
      return {
        duplicate: true,
        duplicateInfo: `${value.model_year} ${value.body_style} ${value.drivetrain} in ${value.ext_color} is already registered under "${value.forum_username}".`,
      };
    }
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const { error } = await supabase.from('bmwic_entries').insert({
    ...toRowFields(value),
    ...coords,
    forum_username: value.forum_username,
    user_submitted: true,
  });

  if (error) {
    // Unique constraint violation means a concurrent duplicate slipped through
    if (error.code === '23505') {
      return {
        duplicate: true,
        duplicateInfo: `This exact build is already registered under "${value.forum_username}".`,
      };
    }
    console.error('Insert error:', error);
    return { error: 'Failed to save your submission. Please try again.' };
  }

  await purgeEntryCaches();
  redirect('/entries?submitted=1');
}

export async function verifyForumUsername(
  _prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  // ── Turnstile verification ────────────────────────────────────────────────
  const token = formData.get('cf-turnstile-response') as string | null;
  if (!token) {
    return { error: 'Please complete the bot verification.' };
  }
  if (!(await verifyTurnstile(token))) {
    return { error: 'Bot verification failed. Please try again.' };
  }

  const id = (formData.get('id') as string)?.trim();
  const submitted_username = (formData.get('forum_username') as string)?.trim();

  if (!id || !submitted_username) {
    return { error: 'Missing required fields.' };
  }

  const supabase = createAdminClient();
  const { data: entry } = await supabase
    .from('bmwic_entries')
    .select('id, forum_username')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!entry) {
    return { error: 'Entry not found.' };
  }

  if ((entry.forum_username ?? '').toLowerCase() !== submitted_username.toLowerCase()) {
    return { error: 'Username does not match the entry.' };
  }

  const expiresAt = Date.now() + EDIT_TOKEN_TTL_MS;
  const editToken = await generateEditToken(id, entry.forum_username ?? '', expiresAt);
  redirect(`/edit/${id}?token=${editToken}&exp=${expiresAt}`);
}

export async function updateEntry(
  _prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const id = (formData.get('id') as string)?.trim();
  const editToken = (formData.get('edit_token') as string)?.trim();
  const expParam = (formData.get('exp') as string)?.trim();

  if (!id || !editToken || !expParam) {
    return { error: 'Missing required fields.' };
  }

  const expiresAt = parseInt(expParam, 10);
  if (!expiresAt || Date.now() > expiresAt) {
    return { error: 'Your edit session has expired. Please go back and verify your username again.' };
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('bmwic_entries')
    .select('id, forum_username, edit_count, location_city, location_state, location_country, location_lat, location_lng')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!existing) {
    return { error: 'Entry not found.' };
  }

  const expectedToken = await generateEditToken(id, existing.forum_username ?? '', expiresAt);
  if (!timingSafeEqual(editToken, expectedToken)) {
    return { error: 'Unauthorized.' };
  }

  // The edit form does not expose forum_username (ownership is fixed), but the
  // validator requires it — supply the row's own value on a copy of the payload.
  const fields = new FormData();
  formData.forEach((v, k) => fields.append(k, v));
  if (!(fields.get('forum_username') as string)?.trim()) {
    fields.set('forum_username', existing.forum_username ?? '');
  }

  const parsed = validateEntryInput(fields);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const value = parsed.value;

  let coords: Coords = {
    location_lat: existing.location_lat,
    location_lng: existing.location_lng,
  };

  const locationChanged =
    value.location_city !== existing.location_city ||
    value.location_state !== existing.location_state ||
    value.location_country !== existing.location_country;

  if (locationChanged) {
    coords = await geocode(value.location_city, value.location_state, value.location_country);
  }

  const { error } = await supabase
    .from('bmwic_entries')
    .update({
      ...toRowFields(value),
      ...coords,
      edit_count: ((existing.edit_count as number) ?? 0) + 1,
      last_edited_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { error: 'Failed to save changes. Please try again.' };
  }

  await purgeEntryCaches();
  redirect('/entries?updated=1');
}

export async function flagEntry(id: string, tsToken: string): Promise<{ ok: boolean }> {
  if (!(await verifyTurnstile(tsToken))) return { ok: false };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('increment_flag', { entry_id: id });
  if (error) {
    console.error('Flag error:', error);
    return { ok: false };
  }
  return { ok: true };
}

/** Admin soft delete — the row is retained and can be restored. */
export async function deleteEntry(id: string, token: string): Promise<{ error?: string }> {
  if (!isAdminToken(token)) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bmwic_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  await purgeEntryCaches();
  return {};
}

/** Admin restore of a soft-deleted row. */
export async function restoreEntry(id: string, token: string): Promise<{ error?: string }> {
  if (!isAdminToken(token)) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bmwic_entries')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) return { error: error.message };
  await purgeEntryCaches();
  return {};
}

export async function dismissFlag(id: string, token: string): Promise<{ error?: string }> {
  if (!isAdminToken(token)) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').update({ flag_count: 0 }).eq('id', id);
  if (error) return { error: error.message };
  await purgeEntryCaches();
  return {};
}

/** Owner-initiated soft delete, authorised by the signed edit token. */
export async function deleteOwnEntry(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const id = (formData.get('id') as string)?.trim();
  const editToken = (formData.get('edit_token') as string)?.trim();
  const expParam = (formData.get('exp') as string)?.trim();

  if (!id || !editToken || !expParam) {
    return { error: 'Missing required fields.' };
  }

  const expiresAt = parseInt(expParam, 10);
  if (!expiresAt || Date.now() > expiresAt) {
    return { error: 'Your edit session has expired. Please go back and verify your username again.' };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('bmwic_entries')
    .select('id, forum_username')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!existing) {
    return { error: 'Entry not found.' };
  }

  const expectedToken = await generateEditToken(id, existing.forum_username ?? '', expiresAt);
  if (!timingSafeEqual(editToken, expectedToken)) {
    return { error: 'Unauthorized.' };
  }

  const { error: deleteError } = await supabase
    .from('bmwic_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (deleteError) {
    console.error('Delete error:', deleteError);
    return { error: 'Failed to delete entry. Please try again.' };
  }

  await purgeEntryCaches();
  redirect('/entries?deleted=1');
}

/**
 * Single admin form action used by /admin. Reads op/id/token from hidden
 * inputs so the page never has to build closures (Next rejects inline server
 * actions that capture non-serializable values such as helper functions).
 */
export async function adminModerate(formData: FormData): Promise<void> {
  const op = String(formData.get('op') ?? '');
  const id = String(formData.get('id') ?? '').trim();
  const token = String(formData.get('token') ?? '');

  let result: { error?: string } = { error: 'Unknown action.' };
  if (op === 'dismiss') result = await dismissFlag(id, token);
  else if (op === 'delete') result = await deleteEntry(id, token);
  else if (op === 'restore') result = await restoreEntry(id, token);

  const params = new URLSearchParams({ token });
  if (result.error) params.set('error', result.error);
  redirect(`/admin?${params.toString()}`);
}
