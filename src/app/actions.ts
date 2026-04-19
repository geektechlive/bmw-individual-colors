'use server';

import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { createAdminClient } from '../lib/supabase';

interface FormState {
  error?: string;
  duplicate?: boolean;
  duplicateInfo?: string;
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
    console.error('Insert error:', error);
    return { error: 'Failed to save your submission. Please try again.' };
  }

  revalidateTag('entries', {});
  redirect('/entries?submitted=1');
}

interface VerifyState {
  error?: string;
}

async function generateEditToken(id: string, username: string): Promise<string> {
  const secret = process.env.ADMIN_TOKEN ?? '';
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
    new TextEncoder().encode(`${id}:${username.toLowerCase()}`)
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

  const editToken = await generateEditToken(id, entry.forum_username ?? '');
  redirect(`/edit/${id}?token=${editToken}`);
}

export async function updateEntry(
  _prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const id = (formData.get('id') as string)?.trim();
  const editToken = (formData.get('edit_token') as string)?.trim();

  if (!id || !editToken) {
    return { error: 'Missing required fields.' };
  }

  const supabase = createAdminClient();

  // Fetch entry to get forum_username + current location for geocode comparison
  const { data: existing } = await supabase
    .from('bmwic_entries')
    .select('id, forum_username, location_city, location_state, location_country, location_lat, location_lng')
    .eq('id', id)
    .single();

  if (!existing) {
    return { error: 'Entry not found.' };
  }

  // Re-verify the HMAC token — proves the user passed Turnstile verification for this entry
  const expectedToken = await generateEditToken(id, existing.forum_username ?? '');
  if (editToken !== expectedToken) {
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

  // Re-geocode only if location changed
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
  }).eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { error: 'Failed to save changes. Please try again.' };
  }

  revalidateTag('entries', {});
  redirect('/entries?updated=1');
}

export async function flagEntry(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.rpc('increment_flag', { entry_id: id });
}

export async function deleteEntry(id: string, token: string): Promise<{ error?: string }> {
  if (token !== process.env.ADMIN_TOKEN) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function dismissFlag(id: string, token: string): Promise<{ error?: string }> {
  if (token !== process.env.ADMIN_TOKEN) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').update({ flag_count: 0 }).eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteOwnEntry(formData: FormData): Promise<never> {
  const id = (formData.get('id') as string)?.trim();
  const editToken = (formData.get('edit_token') as string)?.trim();

  if (!id || !editToken) {
    throw new Error('Missing required fields.');
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('bmwic_entries')
    .select('id, forum_username')
    .eq('id', id)
    .single();

  if (!existing) {
    throw new Error('Entry not found.');
  }

  const expectedToken = await generateEditToken(id, existing.forum_username ?? '');
  if (editToken !== expectedToken) {
    throw new Error('Unauthorized.');
  }

  await supabase.from('bmwic_entries').delete().eq('id', id);
  revalidateTag('entries', {});
  redirect('/entries?deleted=1');
}
