/**
 * BMW Individual Colors — Attribution Audit Script
 *
 * Scans all seed debug JSON files for entries whose _raw content
 * contains quoted posts ("Quote:" / "Originally Posted by").
 * These are suspected misattributions — car specs extracted from
 * a quoted post but credited to the quoter's username.
 *
 * Run: npx tsx scripts/audit-attributions.ts
 */

import * as fs from "fs";
import * as path from "path";

const SCRIPTS_DIR = path.join(__dirname);
const QUOTE_PATTERNS = [/Quote:/i, /Originally Posted by/i];

interface DebugEntry {
  forum_username: string | null;
  ext_color: string;
  model_year: number;
  body_style: string;
  drivetrain: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  posted_at: string | null;
  _raw: string;
}

interface Suspect {
  file: string;
  forum_username: string | null;
  ext_color: string;
  model_year: number;
  body_style: string;
  location: string;
  quoted_user: string | null;
  raw_snippet: string;
}

function extractQuotedUser(raw: string): string | null {
  const match = raw.match(/Originally Posted by ([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function formatLocation(entry: DebugEntry): string {
  return [entry.location_city, entry.location_state, entry.location_country]
    .filter(Boolean)
    .join(", ") || "(no location)";
}

function isQuotedPost(raw: string): boolean {
  return QUOTE_PATTERNS.some((p) => p.test(raw));
}

function main() {
  const debugFiles = fs
    .readdirSync(SCRIPTS_DIR)
    .filter((f) => f.match(/^seed-data.*-debug\.json$/))
    .map((f) => path.join(SCRIPTS_DIR, f));

  if (debugFiles.length === 0) {
    console.error("No debug seed files found. Run seed-forum.ts with a thread ID first.");
    process.exit(1);
  }

  console.log(`Found ${debugFiles.length} debug file(s):\n`);
  debugFiles.forEach((f) => console.log(`  ${path.basename(f)}`));
  console.log();

  const suspects: Suspect[] = [];
  let totalEntries = 0;

  for (const filePath of debugFiles) {
    const fileName = path.basename(filePath);
    const entries = JSON.parse(fs.readFileSync(filePath, "utf-8")) as DebugEntry[];
    totalEntries += entries.length;

    for (const entry of entries) {
      if (!entry._raw) continue;
      if (!isQuotedPost(entry._raw)) continue;

      suspects.push({
        file: fileName,
        forum_username: entry.forum_username,
        ext_color: entry.ext_color,
        model_year: entry.model_year,
        body_style: entry.body_style,
        location: formatLocation(entry),
        quoted_user: extractQuotedUser(entry._raw),
        raw_snippet: entry._raw.slice(0, 300).replace(/\n/g, " ↵ "),
      });
    }
  }

  console.log("═".repeat(70));
  console.log(`ATTRIBUTION AUDIT RESULTS`);
  console.log("═".repeat(70));
  console.log(`Total entries scanned: ${totalEntries}`);
  console.log(`Suspected misattributions: ${suspects.length}`);
  console.log(
    `Clean rate: ${(((totalEntries - suspects.length) / totalEntries) * 100).toFixed(1)}%`
  );
  console.log();

  if (suspects.length === 0) {
    console.log("✓ No quoted-post attributions detected.");
    return;
  }

  console.log("SUSPECTED MISATTRIBUTIONS:\n");

  for (const s of suspects) {
    console.log(`  File:       ${s.file}`);
    console.log(`  Attributed: ${s.forum_username ?? "(null)"}`);
    console.log(`  Actual:     ${s.quoted_user ? `likely ${s.quoted_user}` : "unknown"}`);
    console.log(`  Car:        ${s.model_year} ${s.body_style} — ${s.ext_color}`);
    console.log(`  Location:   ${s.location}`);
    console.log(`  Raw:        ${s.raw_snippet}`);
    console.log();
  }

  // Summary by username
  const byUser = new Map<string, number>();
  for (const s of suspects) {
    const u = s.forum_username ?? "(null)";
    byUser.set(u, (byUser.get(u) ?? 0) + 1);
  }

  console.log("BY USERNAME (quoters with misattributed entries):");
  [...byUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([u, n]) => console.log(`  ${u}: ${n} suspect entry${n > 1 ? "s" : ""}`));

  console.log();
  console.log(
    suspects.length <= 3
      ? "→ Small scope. Targeted SQL fixes may be faster than a full re-scrape."
      : "→ Larger scope. Recommend fixing the scraper and re-importing."
  );
}

main();
