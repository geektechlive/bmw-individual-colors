'use server';

import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { createAdminClient } from '../lib/supabase';

interface FormState {
  error?: string;
  duplicate?: boolean;
  duplicateInfo?: string;
}

// Constant-time string comparison to prevent timing attacks on token checks.
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export async function submitEntry(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // ── Turnstile verification ────────────────────────────────────────────────
  const token = formData.get('cf-turnstile-response') as string;
  if (!token) {
    return { error: 'Please complete the bot verification.' };
  }
  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { success } = await tsRes.json() as { success: boolean };
  if (!success) {
    return { error: 'Bot verification failed. Please try again.' };
  }

  // ── Required fields ───────────────────────────────────────────────────────
  const ext_color = (formData.get('ext_color') as string)?.trim();
  if (!ext_color) {
    return { error: 'Individual color is required.' };
  }

  const forum_username = (formData.get('forum_username') as string)?.trim();
  if (!forum_username) {
    return { error: 'Forum username is required.' };
  }

  const variant = (formData.get('variant') as string) || 'Competition';
  const competition = variant !== 'Base (RWD)';
  const drivetrain = variant === 'Competition xDrive' ? 'AWD' : 'RWD';
  const transmission = competition ? '8AT' : ((formData.get('transmission') as string) || '8AT');

  const city = (formData.get('location_city') as string)?.trim() ?? '';
  const state = (formData.get('location_state') as string)?.trim() ?? '';
  const country = (formData.get('location_country_name') as string)?.trim()
    || (formData.get('location_country') as string)?.trim()
    || 'United States';

  // ── Geocode via Nominatim ─────────────────────────────────────────────────
  let location_lat: number | null = null;
  let location_lng: number | null = null;

  if (city || state) {
    try {
      const q = [city, state, country].filter(Boolean).join(',');
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'bmw-individual-colors/1.0' } }
      );
      const geoData = await geoRes.json();
      if (geoData.length > 0) {
        location_lat = parseFloat(geoData[0].lat);
        location_lng = parseFloat(geoData[0].lon);
      }
    } catch (e) {
      console.warn('Geocoding failed:', e);
    }
  }

  // ── Duplicate check ───────────────────────────────────────────────────────
  const forceSubmit = formData.get('force_submit') === '1';
  if (!forceSubmit) {
    const supabase = createAdminClient();
    const model_year_check = parseInt(formData.get('model_year') as string, 10);
    const body_style_check = formData.get('body_style') as string;
    const { data: existing } = await supabase
      .from('bmwic_entries')
      .select('id')
      .eq('forum_username', forum_username)
      .eq('ext_color', ext_color)
      .eq('model_year', model_year_check)
      .eq('body_style', body_style_check)
      .eq('drivetrain', drivetrain)
      .limit(1);
    if (existing && existing.length > 0) {
      return {
        duplicate: true,
        duplicateInfo: `${model_year_check} ${body_style_check} ${drivetrain} in ${ext_color} is already registered under "${forum_username}".`,
      };
    }
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').insert({
    model_year: parseInt(formData.get('model_year') as string, 10),
    body_style: formData.get('body_style') as string,
    competition,
    drivetrain,
    transmission,
    ext_color,
    interior_color: (formData.get('interior_color') as string)?.trim() || null,
    interior_seats: (formData.get('interior_seats') as string) || null,
    interior_leather: (formData.get('interior_leather') as string) || null,
    wheels: (formData.get('wheels') as string)?.trim() || null,
    location_city: city || null,
    location_state: state || null,
    location_country: country,
    location_lat,
    location_lng,
    forum_username,
    source_forum: (formData.get('source_forum') as string)?.trim() || 'BimmerPost',
    notes: (formData.get('notes') as string)?.trim() || null,
    user_submitted: true,
  });

  if (error) {
    // Unique constraint violation means concurrent duplicate slipped through
    if (error.code === '23505') {
      return {
        duplicate: true,
        duplicateInfo: `This exact build is already registered under "${forum_username}".`,
      };
    }
    console.error('Insert error:', error);
    return { error: 'Failed to save your submission. Please try again.' };
  }

  revalidateTag('entries', {});
  redirect('/entries?submitted=1');
}

interface VerifyState {
  error?: string;
}

const EDIT_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

async function generateEditToken(id: string, username: string, expiresAt: number): Promise<string> {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) throw new Error('ADMIN_TOKEN environment variable is not configured.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}:${username.toLowerCase()}:${expiresAt}`)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyForumUsername(
  _prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  // ── Turnstile verification ────────────────────────────────────────────────
  const token = formData.get('cf-turnstile-response') as string;
  if (!token) {
    return { error: 'Please complete the bot verification.' };
  }
  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { success } = await tsRes.json() as { success: boolean };
  if (!success) {
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
    .single();

  if (!existing) {
    return { error: 'Entry not found.' };
  }

  const expectedToken = await generateEditToken(id, existing.forum_username ?? '', expiresAt);
  if (!timingSafeEqual(editToken, expectedToken)) {
    return { error: 'Unauthorized.' };
  }

  const ext_color = (formData.get('ext_color') as string)?.trim();
  if (!ext_color) {
    return { error: 'Individual color is required.' };
  }

  const variant = (formData.get('variant') as string) || 'Competition';
  const competition = variant !== 'Base (RWD)';
  const drivetrain = variant === 'Competition xDrive' ? 'AWD' : 'RWD';
  const transmission = competition ? '8AT' : ((formData.get('transmission') as string) || '8AT');

  const city = (formData.get('location_city') as string)?.trim() ?? '';
  const state = (formData.get('location_state') as string)?.trim() ?? '';
  const country = (formData.get('location_country_name') as string)?.trim()
    || (formData.get('location_country') as string)?.trim()
    || 'United States';

  let location_lat: number | null = existing.location_lat;
  let location_lng: number | null = existing.location_lng;

  const locationChanged =
    (city || null) !== existing.location_city ||
    (state || null) !== existing.location_state ||
    country !== existing.location_country;

  if (locationChanged) {
    location_lat = null;
    location_lng = null;
    if (city || state) {
      try {
        const q = [city, state, country].filter(Boolean).join(',');
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'bmw-individual-colors/1.0' } }
        );
        const geoData = await geoRes.json();
        if (geoData.length > 0) {
          location_lat = parseFloat(geoData[0].lat);
          location_lng = parseFloat(geoData[0].lon);
        }
      } catch (e) {
        console.warn('Geocoding failed:', e);
      }
    }
  }

  const { error } = await supabase.from('bmwic_entries').update({
    model_year: parseInt(formData.get('model_year') as string, 10),
    body_style: formData.get('body_style') as string,
    competition,
    drivetrain,
    transmission,
    ext_color,
    interior_color: (formData.get('interior_color') as string)?.trim() || null,
    interior_seats: (formData.get('interior_seats') as string) || null,
    interior_leather: (formData.get('interior_leather') as string) || null,
    wheels: (formData.get('wheels') as string)?.trim() || null,
    location_city: city || null,
    location_state: state || null,
    location_country: country,
    location_lat,
    location_lng,
    source_forum: (formData.get('source_forum') as string)?.trim() || 'BimmerPost',
    notes: (formData.get('notes') as string)?.trim() || null,
    edit_count: (existing.edit_count as number ?? 0) + 1,
    last_edited_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { error: 'Failed to save changes. Please try again.' };
  }

  revalidateTag('entries', {});
  redirect('/entries?updated=1');
}

export async function flagEntry(id: string, tsToken: string): Promise<void> {
  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: tsToken }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { success } = await tsRes.json() as { success: boolean };
  if (!success) return;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('increment_flag', { entry_id: id });
  if (error) console.error('Flag error:', error);
}

export async function deleteEntry(id: string, token: string): Promise<{ error?: string }> {
  if (!timingSafeEqual(token, process.env.ADMIN_TOKEN ?? '')) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function dismissFlag(id: string, token: string): Promise<{ error?: string }> {
  if (!timingSafeEqual(token, process.env.ADMIN_TOKEN ?? '')) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').update({ flag_count: 0 }).eq('id', id);
  if (error) return { error: error.message };
  return {};
}

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
    .single();

  if (!existing) {
    return { error: 'Entry not found.' };
  }

  const expectedToken = await generateEditToken(id, existing.forum_username ?? '', expiresAt);
  if (!timingSafeEqual(editToken, expectedToken)) {
    return { error: 'Unauthorized.' };
  }

  const { error: deleteError } = await supabase.from('bmwic_entries').delete().eq('id', id);
  if (deleteError) {
    console.error('Delete error:', deleteError);
    return { error: 'Failed to delete entry. Please try again.' };
  }

  revalidateTag('entries', {});
  redirect('/entries?deleted=1');
}
