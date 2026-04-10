/**
 * BMW Individual Colors — Database Importer
 *
 * Reads scripts/seed-data.json (produced by seed-forum.ts) and
 * bulk-inserts entries into bmwic_entries via Supabase.
 *
 * Geocodes each city/state entry before inserting.
 *
 * Run: npx tsx scripts/import.ts
 * Options:
 *   --dry-run   Print what would be inserted without writing to DB
 *   --skip-geo  Skip geocoding (faster, no lat/lng)
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local so the script works without inline env vars
const envFile = path.join(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

// Usage: npx tsx scripts/import.ts [seed-file.json]
const SEED_FILE = process.argv.find(a => a.endsWith('.json'))
  ?? path.join(__dirname, "seed-data.json");
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_GEO = process.argv.includes("--skip-geo");
const GEO_DELAY_MS = 1100; // Nominatim rate limit: 1 req/sec

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Geocoding ─────────────────────────────────────────────────────────────────

const geoCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(
  city: string | null,
  state: string | null,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  if (!city && !state) return null;

  const q = [city, state, country].filter(Boolean).join(", ");
  if (geoCache.has(q)) return geoCache.get(q)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "bmw-individual-colors/1.0 (geektechlive@gmail.com)",
      },
    });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const result = data[0]
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      : null;
    geoCache.set(q, result);
    return result;
  } catch {
    geoCache.set(q, null);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`✗ ${SEED_FILE} not found. Run seed-forum.ts first.`);
    process.exit(1);
  }

  const entries = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8")) as Array<{
    model_year: number;
    body_style: string;
    competition: boolean;
    drivetrain: string;
    transmission: string;
    ext_color: string;
    interior_color: string | null;
    interior_type: string | null;
    wheels: string | null;
    location_city: string | null;
    location_state: string | null;
    location_country: string;
    forum_username: string | null;
    posted_at?: string | null;
    notes: string | null;
  }>;

  console.log(`Loaded ${entries.length} entries from ${SEED_FILE}`);
  if (DRY_RUN) console.log("DRY RUN — nothing will be written to the database.\n");

  // Check for existing entries to avoid re-importing
  let existingKeys = new Set<string>();
  if (!DRY_RUN) {
    const { data: existing } = await supabase
      .from("bmwic_entries")
      .select("forum_username, ext_color, model_year");
    if (existing) {
      existingKeys = new Set(
        existing.map((e: { forum_username: string; ext_color: string; model_year: number }) =>
          `${e.forum_username}|${e.ext_color}|${e.model_year}`
        )
      );
      console.log(`Found ${existingKeys.size} existing entries in DB — skipping duplicates.\n`);
    }
  }

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = `${entry.forum_username}|${entry.ext_color}|${entry.model_year}`;

    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Geocode
    let lat: number | null = null;
    let lng: number | null = null;
    if (!SKIP_GEO && (entry.location_city || entry.location_state)) {
      process.stdout.write(
        `  [${i + 1}/${entries.length}] Geocoding "${entry.location_city}, ${entry.location_state}"... `
      );
      const geo = await geocode(entry.location_city, entry.location_state, entry.location_country);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        console.log(`✓ (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
      } else {
        console.log("✗ not found");
      }
      await sleep(GEO_DELAY_MS);
    }

    const row = { ...entry, location_lat: lat, location_lng: lng };

    if (DRY_RUN) {
      console.log(`  [DRY] ${entry.ext_color} | ${entry.model_year} ${entry.body_style} | ${entry.forum_username}`);
      inserted++;
      continue;
    }

    const { error } = await supabase.from("bmwic_entries").insert(row);
    if (error) {
      console.error(`  ✗ Failed to insert ${key}:`, error.message);
      failed++;
    } else {
      inserted++;
    }
  }

  console.log(`\n✓ Import complete.`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
