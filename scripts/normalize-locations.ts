/**
 * BMW Individual Colors — Location Normalization Script
 *
 * Cleans up messy location data in bmwic_entries:
 *   - Normalizes country names (USA → United States)
 *   - Expands state abbreviations (CA → California, TX → Texas, etc.)
 *   - Moves state names from location_city into location_state
 *   - Maps informal/regional names to canonical city + state
 *   - Re-geocodes any entry whose location fields changed
 *
 * Run:     npx tsx scripts/normalize-locations.ts
 * Options:
 *   --dry-run   Preview changes without writing to DB or calling Nominatim
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const DRY_RUN = process.argv.includes("--dry-run");
const GEO_DELAY_MS = 1200; // Nominatim: 1 req/sec max

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Normalization tables ───────────────────────────────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  USA: "United States",
};

const STATE_ABBR: Record<string, string> = {
  AK: "Alaska", AL: "Alabama", AR: "Arkansas", AZ: "Arizona",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", IA: "Iowa",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts", MD: "Maryland",
  ME: "Maine", MI: "Michigan", MN: "Minnesota", MO: "Missouri",
  MS: "Mississippi", MT: "Montana", NC: "North Carolina", ND: "North Dakota",
  NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NV: "Nevada", NY: "New York", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VA: "Virginia", VT: "Vermont", WA: "Washington", WI: "Wisconsin",
  WV: "West Virginia", WY: "Wyoming",
};

// US state full names that sometimes appear in location_city with state=null
const US_STATE_NAMES = new Set(Object.values(STATE_ABBR));

interface CityRule {
  newCity: string | null;
  newState: string | null;
}

// Informal/regional names → canonical values
// null means "clear this field"
const CITY_REMAPS: Record<string, CityRule> = {
  // California
  NorCal:                { newCity: null,            newState: "California" },
  "Northern California": { newCity: null,            newState: "California" },
  "SF Bay Area":         { newCity: "San Francisco", newState: "California" },
  "Bay Area":            { newCity: "San Francisco", newState: "California" },
  SoCal:                 { newCity: null,            newState: "California" },
  "Southern California": { newCity: null,            newState: "California" },
  "City of Angels":      { newCity: "Los Angeles",   newState: "California" },
  "US so cal":           { newCity: null,            newState: "California" },
  "California US":       { newCity: null,            newState: "California" },
  CA:                    { newCity: null,            newState: "California" },
  // Texas
  DFW:   { newCity: "Dallas", newState: "Texas" },
  TX:    { newCity: null,     newState: "Texas" },
  "US-TX": { newCity: null,   newState: "Texas" },
  // Illinois
  Chicagoland: { newCity: "Chicago", newState: "Illinois" },
  Chicago:     { newCity: "Chicago", newState: "Illinois" },
  // New York
  NYC:          { newCity: "New York City", newState: "New York" },
  NY:           { newCity: null,            newState: "New York" },
  "Long Island": { newCity: "Long Island",  newState: "New York" },
  "New York":   { newCity: null,            newState: "New York" },
  // Washington
  Seattle:                    { newCity: "Seattle", newState: "Washington" },
  "Seattle WA":               { newCity: "Seattle", newState: "Washington" },
  "Southern Washington State": { newCity: null,     newState: "Washington" },
  "US-PNW":                   { newCity: null,      newState: null },
  // Virginia
  "Northern VA": { newCity: null, newState: "Virginia" },
  // Florida
  "US - FL": { newCity: null,   newState: "Florida" },
  Miami:     { newCity: "Miami", newState: "Florida" },
  // Ohio
  OH: { newCity: null, newState: "Ohio" },
  // North Carolina
  NC: { newCity: null, newState: "North Carolina" },
  // Georgia
  Atlanta: { newCity: "Atlanta", newState: "Georgia" },
  // Colorado
  Denver: { newCity: "Denver", newState: "Colorado" },
  CO:     { newCity: null,     newState: "Colorado" },
  // Connecticut
  "Conn.":       { newCity: null, newState: "Connecticut" },
  CT:            { newCity: null, newState: "Connecticut" },
  Connecticut:   { newCity: null, newState: "Connecticut" },
  // Maryland
  "USA (Maryland)": { newCity: null, newState: "Maryland" },
  // Indiana
  "(state): Indiana": { newCity: null, newState: "Indiana" },
  // Pennsylvania
  PA: { newCity: null, newState: "Pennsylvania" },
  // Vague / country names used as city
  US:        { newCity: null, newState: null },
  Australia: { newCity: null, newState: null },
  Canada:    { newCity: null, newState: null },
  Germany:   { newCity: null, newState: null },
  UK:        { newCity: null, newState: null },
};

// ── Geocoding ─────────────────────────────────────────────────────────────────

const geoCache = new Map<string, { lat: number; lng: number } | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(
  city: string | null,
  state: string | null,
  country: string | null
): Promise<{ lat: number; lng: number } | null> {
  if (!city && !state) return null;

  const q = [city, state, country].filter(Boolean).join(", ");
  if (geoCache.has(q)) return geoCache.get(q)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "bmw-individual-colors/1.0 (https://mcolors.geektechlive.com)" },
    });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const result = data[0]
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      : null;
    geoCache.set(q, result);
    await sleep(GEO_DELAY_MS);
    return result;
  } catch {
    geoCache.set(q, null);
    return null;
  }
}

// ── Normalize a single entry ───────────────────────────────────────────────────

interface Entry {
  id: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

interface Normalized {
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
}

function normalize(entry: Entry): Normalized {
  let city = entry.location_city?.trim() ?? null;
  let state = entry.location_state?.trim() ?? null;
  let country = entry.location_country?.trim() ?? null;

  // 1. Normalize country
  if (country && COUNTRY_MAP[country]) country = COUNTRY_MAP[country];

  // 2. Expand state abbreviation in the state field
  if (state && STATE_ABBR[state]) state = STATE_ABBR[state];

  // 3. Check if city field is actually a US state name (full) — move it
  if (city && US_STATE_NAMES.has(city) && !state) {
    state = city;
    city = null;
  }

  // 4. Check if city field is a state abbreviation — expand and move it
  if (city && STATE_ABBR[city] && !state) {
    state = STATE_ABBR[city];
    city = null;
  }

  // 5. Apply city remaps (informal/regional names)
  if (city && CITY_REMAPS[city]) {
    const rule = CITY_REMAPS[city];
    if (rule.newState !== null || rule.newCity !== null) {
      // Only override state if the rule specifies one
      if (rule.newState !== null) state = rule.newState;
      city = rule.newCity;
    } else {
      // Both null = just clear city, leave state
      city = null;
    }
  }

  return { location_city: city, location_state: state, location_country: country };
}

function changed(entry: Entry, norm: Normalized): boolean {
  return (
    entry.location_city !== norm.location_city ||
    entry.location_state !== norm.location_state ||
    entry.location_country !== norm.location_country
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "DRY RUN — nothing will be written.\n" : "");

  const { data, error } = await supabase
    .from("bmwic_entries")
    .select("id, location_city, location_state, location_country, location_lat, location_lng");

  if (error) {
    console.error("Failed to fetch entries:", error.message);
    process.exit(1);
  }

  const entries = data as Entry[];
  console.log(`Fetched ${entries.length} entries.\n`);

  let toUpdate = 0;
  let needsGeo = 0;
  let unchanged = 0;

  for (const entry of entries) {
    const norm = normalize(entry);

    if (!changed(entry, norm)) {
      unchanged++;
      continue;
    }

    toUpdate++;
    const geoChanged =
      norm.location_city !== entry.location_city ||
      norm.location_state !== entry.location_state;

    console.log(`[${toUpdate}] ID ${entry.id}`);
    console.log(
      `  Before: city=${JSON.stringify(entry.location_city)}, state=${JSON.stringify(entry.location_state)}, country=${JSON.stringify(entry.location_country)}`
    );
    console.log(
      `  After:  city=${JSON.stringify(norm.location_city)}, state=${JSON.stringify(norm.location_state)}, country=${JSON.stringify(norm.location_country)}`
    );

    let newLat = entry.location_lat;
    let newLng = entry.location_lng;

    if (geoChanged) {
      needsGeo++;
      if (DRY_RUN) {
        console.log(`  → would re-geocode`);
      } else {
        const geo = await geocode(norm.location_city, norm.location_state, norm.location_country);
        if (geo) {
          newLat = geo.lat;
          newLng = geo.lng;
          console.log(`  → geocoded: (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`);
        } else {
          console.log(`  → geocode returned no result, keeping existing coords`);
        }
      }
    }

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("bmwic_entries")
        .update({
          location_city: norm.location_city,
          location_state: norm.location_state,
          location_country: norm.location_country,
          location_lat: newLat,
          location_lng: newLng,
        })
        .eq("id", entry.id);

      if (updateError) {
        console.error(`  ✗ Update failed: ${updateError.message}`);
      } else {
        console.log(`  ✓ Updated`);
      }
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Total entries:    ${entries.length}`);
  console.log(`Unchanged:        ${unchanged}`);
  console.log(`To update:        ${toUpdate}`);
  console.log(`Need re-geocode:  ${needsGeo}`);
  if (DRY_RUN) console.log(`\nRe-run without --dry-run to apply changes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
