'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '../lib/supabase';

interface FormState {
  error?: string;
}

export async function submitEntry(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const city = (formData.get('location_city') as string)?.trim() ?? '';
  const state = (formData.get('location_state') as string)?.trim() ?? '';
  // Form sends ISO code in location_country; full name in location_country_name
  const country = (formData.get('location_country_name') as string)?.trim()
    || (formData.get('location_country') as string)?.trim()
    || 'United States';

  const ext_color = (formData.get('ext_color') as string)?.trim();

  if (!ext_color) {
    return { error: 'Individual color is required.' };
  }

  // Geocode via Nominatim
  let location_lat: number | null = null;
  let location_lng: number | null = null;

  if (city || state) {
    try {
      const q = [city, state, country].filter(Boolean).join(',');
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        {
          headers: { 'User-Agent': 'bmw-individual-colors/1.0' },
        }
      );
      const geoData = await geoRes.json();
      if (geoData.length > 0) {
        location_lat = parseFloat(geoData[0].lat);
        location_lng = parseFloat(geoData[0].lon);
      }
    } catch (e) {
      // Geocoding failure is non-fatal
      console.warn('Geocoding failed:', e);
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('bmwic_entries').insert({
    model_year: parseInt(formData.get('model_year') as string, 10),
    body_style: formData.get('body_style') as string,
    competition: formData.get('competition') === 'on',
    drivetrain: formData.get('drivetrain') as string,
    transmission: formData.get('transmission') as string,
    ext_color,
    interior_color: (formData.get('interior_color') as string)?.trim() || null,
    interior_type: (formData.get('interior_type') as string) || null,
    wheels: (formData.get('wheels') as string)?.trim() || null,
    location_city: city || null,
    location_state: state || null,
    location_country: country,
    location_lat,
    location_lng,
    forum_username: (formData.get('forum_username') as string)?.trim() || null,
    source_forum: (formData.get('source_forum') as string)?.trim() || 'BimmerPost',
    notes: (formData.get('notes') as string)?.trim() || null,
  });

  if (error) {
    console.error('Insert error:', error);
    return { error: 'Failed to save your submission. Please try again.' };
  }

  redirect('/entries?submitted=1');
}
