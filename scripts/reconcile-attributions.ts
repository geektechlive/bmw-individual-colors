/**
 * BMW Individual Colors — Attribution Reconciler
 *
 * Diffs the clean re-scraped seed files against the live DB to identify:
 *   - MATCHED:    entry in both seed and DB — confirmed, no action needed
 *   - SEED_ONLY:  entry in seed but not DB  — new, should be inserted
 *   - DB_ONLY:    entry in DB but not seed  — suspect misattribution or
 *                 from pages beyond the scrape range; review before deleting
 *
 * Match key: forum_username|ext_color|model_year  (same as import.ts)
 *
 * Run:     npx tsx scripts/reconcile-attributions.ts
 * Options:
 *   --dry-run           Preview only (default if neither flag is given)
 *   --apply             Insert SEED_ONLY entries into DB (geocodes each one)
 *   --delete-unmatched  Also DELETE the DB_ONLY entries (use with caution!)
 *   --skip-geo          Skip geocoding when inserting (faster)
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── Env setup ─────────────────────────────────────────────────────────────────

const envFile = path.join(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const DRY_RUN = !process.argv.includes("--apply");
const DELETE_UNMATCHED = process.argv.includes("--delete-unmatched");
const SKIP_GEO = process.argv.includes("--skip-geo");
const GEO_DELAY_MS = 1100;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Seed file locations ───────────────────────────────────────────────────────

const SEED_FILES = [
  "seed-data-1835705.json",
  "seed-data-2041992.json",
  "seed-data-2229924.json",
].map((f) => path.join(__dirname, f));

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeedEntry {
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
}

interface DbEntry {
  id: string;
  model_year: number;
  body_style: string;
  drivetrain: string;
  ext_color: string;
  forum_username: string | null;
  location_city: string | null;
  location_state: string | null;
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

const geoCache = new Map<string, { lat: number; lng: number } | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

// ── Key function (must match import.ts) ──────────────────────────────────────

function key(username: string | null, extColor: string, modelYear: number): string {
  return `${username}|${extColor}|${modelYear}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Load seed entries
  const seedEntries: SeedEntry[] = [];
  for (const filePath of SEED_FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠  Seed file not found, skipping: ${path.basename(filePath)}`);
      continue;
    }
    const entries = JSON.parse(fs.readFileSync(filePath, "utf-8")) as SeedEntry[];
    seedEntries.push(...entries);
    console.log(`  Loaded ${entries.length} entries from ${path.basename(filePath)}`);
  }
  console.log(`  → ${seedEntries.length} total seed entries\n`);

  const seedByKey = new Map<string, SeedEntry>();
  for (const e of seedEntries) {
    const k = key(e.forum_username, e.ext_color, e.model_year);
    if (!seedByKey.has(k)) seedByKey.set(k, e);
  }

  // 2. Load DB entries
  const { data, error } = await supabase
    .from("bmwic_entries")
    .select("id, model_year, body_style, drivetrain, ext_color, forum_username, location_city, location_state");

  if (error) {
    console.error("Failed to fetch DB entries:", error.message);
    process.exit(1);
  }

  const dbEntries = data as DbEntry[];
  console.log(`  Loaded ${dbEntries.length} entries from DB\n`);

  const dbByKey = new Map<string, DbEntry>();
  for (const e of dbEntries) {
    const k = key(e.forum_username, e.ext_color, e.model_year);
    if (!dbByKey.has(k)) dbByKey.set(k, e);
  }

  // 3. Classify
  const matched: Array<{ k: string; seed: SeedEntry; db: DbEntry }> = [];
  const seedOnly: SeedEntry[] = [];
  const dbOnly: DbEntry[] = [];

  for (const [k, seed] of seedByKey) {
    const db = dbByKey.get(k);
    if (db) {
      matched.push({ k, seed, db });
    } else {
      seedOnly.push(seed);
    }
  }

  for (const [k, db] of dbByKey) {
    if (!seedByKey.has(k)) {
      dbOnly.push(db);
    }
  }

  // 4. Report
  console.log("═".repeat(70));
  console.log("RECONCILIATION REPORT");
  console.log("═".repeat(70));
  console.log(`  DB total:       ${dbEntries.length}`);
  console.log(`  Seed total:     ${seedEntries.length}`);
  console.log(`  Matched:        ${matched.length}  (confirmed by clean scrape)`);
  console.log(`  Seed-only:      ${seedOnly.length}  (in clean scrape, not in DB — will INSERT)`);
  console.log(`  DB-only:        ${dbOnly.length}  (in DB, not in clean scrape — SUSPECT)`);
  console.log();

  if (seedOnly.length > 0) {
    console.log(`SEED_ONLY — new entries to insert:\n`);
    for (const e of seedOnly) {
      console.log(
        `  ${e.model_year} ${e.body_style} ${e.drivetrain} — ${e.ext_color}` +
        ` | @${e.forum_username} | ${[e.location_city, e.location_state].filter(Boolean).join(", ") || "(no location)"}`
      );
    }
    console.log();
  }

  if (dbOnly.length > 0) {
    console.log(`DB_ONLY — suspect entries (not in clean scrape):\n`);

    // Group by username for readability
    const byUser = new Map<string, DbEntry[]>();
    for (const e of dbOnly) {
      const u = e.forum_username ?? "(null)";
      if (!byUser.has(u)) byUser.set(u, []);
      byUser.get(u)!.push(e);
    }

    for (const [u, entries] of [...byUser.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  @${u} (${entries.length} entry${entries.length > 1 ? "s" : ""}):`);
      for (const e of entries) {
        console.log(
          `    ${e.model_year} ${e.body_style} ${e.drivetrain} — ${e.ext_color}` +
          ` | ${[e.location_city, e.location_state].filter(Boolean).join(", ") || "(no location)"}`
        );
      }
    }
    console.log();

    if (DELETE_UNMATCHED && DRY_RUN) {
      console.log("  → --delete-unmatched flag set, but running dry-run. Pass --apply to execute.");
    } else if (!DELETE_UNMATCHED) {
      console.log("  → Pass --delete-unmatched with --apply to remove these from the DB.");
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no changes made. Pass --apply to execute.");
    return;
  }

  // 5. Apply: insert SEED_ONLY entries
  let inserted = 0;
  let insertFailed = 0;

  if (seedOnly.length > 0) {
    console.log(`\nInserting ${seedOnly.length} new entries...`);
    for (const entry of seedOnly) {
      let lat: number | null = null;
      let lng: number | null = null;
      if (!SKIP_GEO && (entry.location_city || entry.location_state)) {
        const geo = await geocode(entry.location_city, entry.location_state, entry.location_country);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      const { error: insertError } = await supabase.from("bmwic_entries").insert({
        ...entry,
        location_lat: lat,
        location_lng: lng,
        source_forum: "BimmerPost",
      });

      if (insertError) {
        console.error(`  ✗ Insert failed for ${key(entry.forum_username, entry.ext_color, entry.model_year)}: ${insertError.message}`);
        insertFailed++;
      } else {
        console.log(`  ✓ Inserted: ${entry.ext_color} | ${entry.model_year} ${entry.body_style} | @${entry.forum_username}`);
        inserted++;
      }
    }
  }

  // 6. Apply: delete DB_ONLY entries (only if --delete-unmatched)
  let deleted = 0;
  let deleteFailed = 0;

  if (DELETE_UNMATCHED && dbOnly.length > 0) {
    const ids = dbOnly.map((e) => e.id);
    console.log(`\nDeleting ${ids.length} suspect DB-only entries...`);
    const { error: deleteError } = await supabase
      .from("bmwic_entries")
      .delete()
      .in("id", ids);

    if (deleteError) {
      console.error(`  ✗ Delete failed: ${deleteError.message}`);
      deleteFailed = ids.length;
    } else {
      console.log(`  ✓ Deleted ${ids.length} entries`);
      deleted = ids.length;
    }
  }

  // 7. Final summary
  console.log("\n──────────────────────────────");
  console.log(`Inserted:  ${inserted}${insertFailed ? ` (${insertFailed} failed)` : ""}`);
  if (DELETE_UNMATCHED) {
    console.log(`Deleted:   ${deleted}${deleteFailed ? ` (${deleteFailed} failed)` : ""}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
