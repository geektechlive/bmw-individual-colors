/**
 * BMW Individual Colors — Date Backfill Script
 *
 * Reads newly scraped seed JSON files (which now include `posted_at`)
 * and updates existing bmwic_entries rows by matching on
 * (forum_username, ext_color, model_year).
 *
 * Run: npx tsx scripts/backfill-dates.ts
 * Options:
 *   --dry-run   Print what would be updated without writing to DB
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envFile = path.join(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface SeedEntry {
  model_year: number;
  ext_color: string;
  forum_username: string | null;
  posted_at?: string | null;
}

interface DbEntry {
  id: string;
  forum_username: string | null;
  ext_color: string;
  model_year: number;
  posted_at: string | null;
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — nothing will be written to the database.\n");

  // Load all seed files that have posted_at data
  const seedFiles = [
    "seed-data-1835705.json",
    "seed-data-2041992.json",
    "seed-data-2229924.json",
    "seed-data.json",
  ]
    .map((f) => path.join(__dirname, f))
    .filter((f) => fs.existsSync(f));

  if (seedFiles.length === 0) {
    console.error("No seed JSON files found. Run seed-forum.ts for each thread first.");
    process.exit(1);
  }

  // Build a map of key → posted_at from all seed files
  const dateMap = new Map<string, string>();
  for (const file of seedFiles) {
    const entries = JSON.parse(fs.readFileSync(file, "utf-8")) as SeedEntry[];
    let withDate = 0;
    for (const e of entries) {
      if (e.posted_at && e.forum_username) {
        const key = `${e.forum_username}|${e.ext_color}|${e.model_year}`;
        dateMap.set(key, e.posted_at);
        withDate++;
      }
    }
    console.log(`${path.basename(file)}: ${entries.length} entries, ${withDate} with posted_at`);
  }

  console.log(`\nTotal date mappings: ${dateMap.size}`);

  if (dateMap.size === 0) {
    console.error("\nNo posted_at dates found in seed files. Re-scrape with the updated seed-forum.ts first.");
    process.exit(1);
  }

  // Fetch all DB rows
  const { data: rows, error } = await supabase
    .from("bmwic_entries")
    .select("id, forum_username, ext_color, model_year, posted_at");

  if (error) {
    console.error("Failed to fetch entries:", error.message);
    process.exit(1);
  }

  const dbRows = rows as DbEntry[];
  console.log(`\nFetched ${dbRows.length} rows from DB`);

  let updated = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const row of dbRows) {
    // Skip if already has a posted_at
    if (row.posted_at) {
      skipped++;
      continue;
    }

    const key = `${row.forum_username}|${row.ext_color}|${row.model_year}`;
    const postedAt = dateMap.get(key);

    if (!postedAt) {
      unmatched++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${key} → ${postedAt}`);
      updated++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("bmwic_entries")
      .update({ posted_at: postedAt })
      .eq("id", row.id);

    if (updateError) {
      console.error(`  ✗ Failed to update ${key}:`, updateError.message);
    } else {
      updated++;
    }
  }

  console.log(`\n✓ Backfill complete.`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Skipped (already had date): ${skipped}`);
  console.log(`  Unmatched: ${unmatched}`);

  if (unmatched > 0) {
    console.log(`\n  Note: ${unmatched} rows had no matching date in seed files.`);
    console.log(`  These may be entries submitted via the web form (not from forum scraping).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
