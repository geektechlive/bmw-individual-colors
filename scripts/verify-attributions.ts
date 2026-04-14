/**
 * BMW Individual Colors — Attribution Verifier
 *
 * Classifies all DB-only entries (in DB but not in clean seed) using multiple
 * evidence sources, working from most trusted to least:
 *
 *   VERIFIED_EXCEL    — matches hand-typed Excel ground truth
 *   EXCEL_MISMATCH   — username in Excel, but different car → DELETE candidate
 *   PROBABLE_DUPLICATE — same user+year, color name is a near-match to a seed
 *                        entry already in DB → stale duplicate → DELETE
 *   VERIFIED_POST     — found a matching post in the forum thread
 *   MISMATCH_POST     — found posts by that user but no car match → DELETE candidate
 *   NOT_FOUND         — username has no posts with matching data → REVIEW
 *
 * Modes:
 *   npx tsx scripts/verify-attributions.ts                  dry-run report
 *   npx tsx scripts/verify-attributions.ts --apply          delete bad entries
 *   npx tsx scripts/verify-attributions.ts --discover-threads  list forum threads
 *   npx tsx scripts/verify-attributions.ts --skip-fetch     skip web fetch phase
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── Env ────────────────────────────────────────────────────────────────────────

const envFile = path.join(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const APPLY = process.argv.includes("--apply");
const SKIP_FETCH = process.argv.includes("--skip-fetch");
const DISCOVER_THREADS = process.argv.includes("--discover-threads");
const DELAY_MS = 1500;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Types ─────────────────────────────────────────────────────────────────────

type Classification =
  | "VERIFIED_EXCEL"
  | "EXCEL_MISMATCH"
  | "PROBABLE_DUPLICATE"
  | "VERIFIED_POST"
  | "MISMATCH_POST"
  | "NOT_FOUND"
  | "PENDING";

interface DbEntry {
  id: string;
  forum_username: string | null;
  model_year: number;
  body_style: string;
  drivetrain: string;
  ext_color: string;
  location_city: string | null;
  location_state: string | null;
}

interface SeedEntry {
  forum_username: string | null;
  model_year: number;
  body_style: string;
  drivetrain: string;
  ext_color: string;
}

interface GroundTruth {
  username: string;       // original casing from Excel
  usernameLower: string;  // lowercased for comparisons
  model_year: number;
  ext_color: string;
  body_style: string;
  competition: boolean;
  drivetrain: string;
  location: string | null;
}

interface Result {
  db: DbEntry;
  classification: Classification;
  reason: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize a color name for fuzzy comparison */
function normalizeColor(c: string): string {
  return c
    .toLowerCase()
    .replace(/\bmetallic\b|\bpearl\b|\biii\b|\bii\b/g, "")
    .replace(/\*$/, "")                    // strip asterisk annotations
    .replace(/\/.*$/, "")                  // drop everything after slash (e.g. Enzianblau suffix)
    .replace(/\b(p\d{2})\b/g, "")         // drop paint codes like P28
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Excel ground truth parsing ────────────────────────────────────────────────

function parseType(type: string): { body_style: string; competition: boolean; drivetrain: string } {
  // e.g. "M3C AWD", "M3C RWD", "M3 6MT", "M4C", "M3", "M4C AWD"
  const upper = type.trim().toUpperCase();
  const body_style = upper.startsWith("M4") ? "M4" : "M3";
  const competition = upper.includes("C");
  const drivetrain = upper.includes("AWD")
    ? "AWD"
    : upper.includes("6MT")
    ? "RWD"
    : upper.includes("RWD")
    ? "RWD"
    : "AWD"; // default Competition without suffix → AWD (most common)
  return { body_style, competition, drivetrain };
}

function loadGroundTruth(): GroundTruth[] {
  const filePath = path.join(__dirname, "ground-truth.json");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠  ground-truth.json not found — Excel phase skipped");
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Array<{
    MY: number;
    Type: string;
    "Ext. Color": string;
    Location: string | null;
    Username: string;
  }>;
  return raw
    .filter((r) => r.Username && r.MY && r["Ext. Color"])
    .map((r) => ({
      username: r.Username.trim(),
      usernameLower: r.Username.toLowerCase().trim(),
      model_year: Number(r.MY),
      ext_color: r["Ext. Color"],
      location: r.Location,
      ...parseType(r.Type),
    }));
}

// ── Seed loading ──────────────────────────────────────────────────────────────

const SEED_FILES = ["seed-data-1835705.json", "seed-data-2041992.json", "seed-data-2229924.json"].map(
  (f) => path.join(__dirname, f)
);

function loadSeed(): SeedEntry[] {
  const entries: SeedEntry[] = [];
  for (const filePath of SEED_FILES) {
    if (fs.existsSync(filePath)) {
      entries.push(...(JSON.parse(fs.readFileSync(filePath, "utf-8")) as SeedEntry[]));
    }
  }
  return entries;
}

// ── Forum post fetching ────────────────────────────────────────────────────────

const THREADS = [
  { id: "1835705", pages: 33 },
  { id: "2041992", pages: 10 },
  { id: "2229924", pages: 60 },
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Fetch all pages of a thread and return username (lowercase) → post texts */
async function buildPostMap(
  threadId: string,
  pages: number
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const baseUrl = `https://g80.bimmerpost.com/forums/showthread.php?t=${threadId}`;

  for (let page = 1; page <= pages; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
    try {
      const html = await fetchPage(url);
      // Extract username → post text pairs
      const usernameMap = new Map<string, string>();
      const userRe = /id="post(\d+)"[\s\S]*?class="bigusername"[^>]*>([^<]+)<\/a>/g;
      let um: RegExpExecArray | null;
      while ((um = userRe.exec(html)) !== null) {
        usernameMap.set(um[1], um[2].trim().toLowerCase());
      }

      const msgRe =
        /id="post_message_(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*\/\s*message/g;
      let mm: RegExpExecArray | null;
      while ((mm = msgRe.exec(html)) !== null) {
        const postId = mm[1];
        const rawHtml = mm[2];
        const username = usernameMap.get(postId) ?? "unknown";
        // Simple text extraction (no quote stripping needed here — we WANT to see all text)
        const text = rawHtml
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
        const existing = map.get(username) ?? [];
        existing.push(text);
        map.set(username, existing);
      }

      // Check if we've reached the last page
      if (!html.includes(`page=${page + 1}`) && page < pages) {
        break; // thread is shorter than expected
      }

      process.stdout.write(`  thread ${threadId}: page ${page}/${pages}\r`);
      if (page < pages) await sleep(DELAY_MS);
    } catch {
      // Page doesn't exist — thread ended
      break;
    }
  }
  console.log(`  thread ${threadId}: fetched all pages                `);
  return map;
}

/** Check if any of a user's posts mention this color */
function postMentionsColor(posts: string[], color: string): boolean {
  const normColor = normalizeColor(color);
  if (!normColor) return false;
  return posts.some((text) => normalizeColor(text).includes(normColor));
}

// ── Thread discovery ───────────────────────────────────────────────────────────

async function discoverThreads(): Promise<void> {
  console.log("Fetching forum section f=867...\n");
  const baseUrl = "https://g80.bimmerpost.com/forums/forumdisplay.php?f=867";
  const threads: Array<{ id: string; title: string; flagged: boolean }> = [];

  for (let page = 1; page <= 3; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
    try {
      const html = await fetchPage(url);
      const re = /id="thread_title_(\d+)"[^>]*>([^<]+)</g;
      let m: RegExpExecArray | null;
      let found = 0;
      while ((m = re.exec(html)) !== null) {
        const id = m[1];
        const title = m[2].trim();
        const flagged = /individual|registry|roll\s*call|color|colour/i.test(title);
        threads.push({ id, title, flagged });
        found++;
      }
      if (found === 0) break;
      await sleep(DELAY_MS);
    } catch {
      break;
    }
  }

  console.log(`Found ${threads.length} threads:\n`);
  for (const t of threads) {
    const marker = t.flagged ? "★" : " ";
    console.log(`  ${marker} ${t.id}  ${t.title}`);
  }
  console.log(
    "\n★ = likely relevant (individual/registry/roll call/color in title)"
  );
  console.log(
    "\nCurrently scraping: 1835705, 2041992, 2229924"
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (DISCOVER_THREADS) {
    await discoverThreads();
    return;
  }

  // ── Load data ──────────────────────────────────────────────────────────────

  const groundTruth = loadGroundTruth();
  console.log(`Loaded ${groundTruth.length} Excel ground truth entries`);

  const seedEntries = loadSeed();
  console.log(`Loaded ${seedEntries.length} clean seed entries`);

  const { data: dbData, error: dbError } = await supabase
    .from("bmwic_entries")
    .select("id, forum_username, model_year, body_style, drivetrain, ext_color, location_city, location_state");
  if (dbError) { console.error(dbError.message); process.exit(1); }
  const dbEntries = dbData as DbEntry[];
  console.log(`Loaded ${dbEntries.length} DB entries\n`);

  // Build seed key set (exact match: username|color|year)
  const seedKeys = new Set(
    seedEntries.map((e) => `${(e.forum_username ?? "").toLowerCase()}|${e.ext_color.toLowerCase()}|${e.model_year}`)
  );

  // Build seed lookup: username+year → [colors] (for fuzzy duplicate detection)
  const seedByUserYear = new Map<string, string[]>();
  for (const e of seedEntries) {
    const k = `${(e.forum_username ?? "").toLowerCase()}|${e.model_year}`;
    const existing = seedByUserYear.get(k) ?? [];
    existing.push(e.ext_color);
    seedByUserYear.set(k, existing);
  }

  // Identify DB-only entries
  const dbOnly: DbEntry[] = dbEntries.filter(
    (e) =>
      !seedKeys.has(
        `${(e.forum_username ?? "").toLowerCase()}|${e.ext_color.toLowerCase()}|${e.model_year}`
      )
  );

  console.log(`DB-only entries to classify: ${dbOnly.length}\n`);

  const results: Result[] = [];

  // ── Phase 0: Excel ground truth ────────────────────────────────────────────

  const gtByUser = new Map<string, GroundTruth[]>();
  for (const gt of groundTruth) {
    const existing = gtByUser.get(gt.usernameLower) ?? [];
    existing.push(gt);
    gtByUser.set(gt.usernameLower, existing);
  }

  for (const entry of dbOnly) {
    const userKey = (entry.forum_username ?? "").toLowerCase().trim();
    const gtEntries = gtByUser.get(userKey);

    if (!gtEntries) {
      results.push({ db: entry, classification: "PENDING", reason: "Not in Excel" });
      continue;
    }

    // User appears in Excel — check if any entry matches this car
    const normDbColor = normalizeColor(entry.ext_color);
    const matchedGt = gtEntries.find(
      (gt) => gt.model_year === entry.model_year && normalizeColor(gt.ext_color) === normDbColor
    );

    if (matchedGt) {
      results.push({
        db: entry,
        classification: "VERIFIED_EXCEL",
        reason: `Excel: ${matchedGt.ext_color} / ${matchedGt.body_style} / ${matchedGt.location}`,
      });
    } else {
      // User is in Excel but with a different car
      const gtSummary = gtEntries
        .map((g) => `${g.model_year} ${g.ext_color}`)
        .join(", ");
      results.push({
        db: entry,
        classification: "EXCEL_MISMATCH",
        reason: `Excel has @${entry.forum_username} with: ${gtSummary}`,
      });
    }
  }

  // ── Phase B: Normalized color duplicate detection ──────────────────────────

  for (const result of results.filter((r) => r.classification === "PENDING")) {
    const userKey = (result.db.forum_username ?? "").toLowerCase();
    const yearKey = `${userKey}|${result.db.model_year}`;
    const seedColors = seedByUserYear.get(yearKey) ?? [];

    const normDb = normalizeColor(result.db.ext_color);
    const matchedSeedColor = seedColors.find((sc) => normalizeColor(sc) === normDb);

    if (matchedSeedColor) {
      result.classification = "PROBABLE_DUPLICATE";
      result.reason = `Color "${result.db.ext_color}" ≈ seed "${matchedSeedColor}" for same user+year — stale DB entry`;
    }
  }

  // ── Phase C: Forum post verification ──────────────────────────────────────

  const pending = results.filter((r) => r.classification === "PENDING");

  if (pending.length > 0 && !SKIP_FETCH) {
    console.log(`Fetching forum threads to verify ${pending.length} remaining entries...`);

    // Build combined username → posts map across all threads
    const combinedMap = new Map<string, string[]>();
    for (const { id, pages } of THREADS) {
      const threadMap = await buildPostMap(id, pages);
      for (const [user, posts] of threadMap) {
        const existing = combinedMap.get(user) ?? [];
        existing.push(...posts);
        combinedMap.set(user, existing);
      }
    }
    console.log(`\nBuilt post map for ${combinedMap.size} unique users\n`);

    for (const result of pending) {
      const userKey = (result.db.forum_username ?? "").toLowerCase();
      const userPosts = combinedMap.get(userKey);

      if (!userPosts || userPosts.length === 0) {
        result.classification = "NOT_FOUND";
        result.reason = "Username has no posts in any scraped thread";
        continue;
      }

      if (postMentionsColor(userPosts, result.db.ext_color)) {
        result.classification = "VERIFIED_POST";
        result.reason = `Found post by @${result.db.forum_username} mentioning "${result.db.ext_color}"`;
      } else {
        result.classification = "MISMATCH_POST";
        result.reason = `@${result.db.forum_username} has ${userPosts.length} post(s) but none mention "${result.db.ext_color}"`;
      }
    }
  } else if (pending.length > 0 && SKIP_FETCH) {
    console.log(`Skipping web fetch phase (${pending.length} entries remain PENDING)\n`);
  }

  // ── Report ─────────────────────────────────────────────────────────────────

  const counts = {
    VERIFIED_EXCEL: 0,
    EXCEL_MISMATCH: 0,
    PROBABLE_DUPLICATE: 0,
    VERIFIED_POST: 0,
    MISMATCH_POST: 0,
    NOT_FOUND: 0,
    PENDING: 0,
  };
  for (const r of results) counts[r.classification]++;

  console.log("═".repeat(70));
  console.log("VERIFICATION REPORT");
  console.log("═".repeat(70));
  console.log(`DB-only entries classified: ${results.length}`);
  console.log();
  console.log("  VERIFIED_EXCEL:     " + counts.VERIFIED_EXCEL + "  ← confirmed by hand-typed Excel data");
  console.log("  EXCEL_MISMATCH:     " + counts.EXCEL_MISMATCH + "  ← contradicts Excel → DELETE");
  console.log("  PROBABLE_DUPLICATE: " + counts.PROBABLE_DUPLICATE + "  ← color-name drift duplicate → DELETE");
  console.log("  VERIFIED_POST:      " + counts.VERIFIED_POST + "  ← confirmed by forum post");
  console.log("  MISMATCH_POST:      " + counts.MISMATCH_POST + "  ← user posts don't match → DELETE");
  console.log("  NOT_FOUND:          " + counts.NOT_FOUND + "  ← no matching post found → REVIEW");
  console.log("  PENDING:            " + counts.PENDING + "  ← not yet classified");
  console.log();

  // Print detail by classification
  const order: Classification[] = [
    "EXCEL_MISMATCH",
    "PROBABLE_DUPLICATE",
    "MISMATCH_POST",
    "NOT_FOUND",
    "VERIFIED_POST",
    "VERIFIED_EXCEL",
    "PENDING",
  ];

  for (const cls of order) {
    const group = results.filter((r) => r.classification === cls);
    if (group.length === 0) continue;
    console.log(`\n── ${cls} (${group.length}) ${"─".repeat(50 - cls.length)}`);
    for (const r of group) {
      const loc = [r.db.location_city, r.db.location_state].filter(Boolean).join(", ") || "(no location)";
      console.log(
        `  @${r.db.forum_username}  ${r.db.model_year} ${r.db.body_style} ${r.db.drivetrain} — ${r.db.ext_color} | ${loc}`
      );
      console.log(`    → ${r.reason}`);
    }
  }

  // ── Also: Excel entries missing from DB entirely ───────────────────────────

  console.log("\n\n── EXCEL ENTRIES NOT IN DB ──────────────────────────────────────────");
  const dbUserColors = new Set(
    dbEntries.map((e) => `${(e.forum_username ?? "").toLowerCase()}|${normalizeColor(e.ext_color)}|${e.model_year}`)
  );

  const missingFromDb: GroundTruth[] = [];
  for (const gt of groundTruth) {
    const k = `${gt.usernameLower}|${normalizeColor(gt.ext_color)}|${gt.model_year}`;
    if (!dbUserColors.has(k)) {
      missingFromDb.push(gt);
    }
  }

  if (missingFromDb.length === 0) {
    console.log("  All Excel entries are present in the DB. ✓");
  } else {
    console.log(`  ${missingFromDb.length} Excel entries are NOT in the DB:`);
    for (const gt of missingFromDb) {
      console.log(
        `  @${gt.username}  ${gt.model_year} ${gt.body_style} ${gt.drivetrain} — ${gt.ext_color} | ${gt.location ?? "(no location)"}`
      );
    }
    if (!APPLY) {
      console.log("\n  → Pass --apply to insert these missing entries into the DB.");
    }
  }

  // ── Apply ──────────────────────────────────────────────────────────────────

  if (!APPLY) {
    console.log("\n\nDRY RUN — no changes made. Pass --apply to execute.");
    return;
  }

  const toDelete = results
    .filter((r) =>
      ["EXCEL_MISMATCH", "PROBABLE_DUPLICATE", "MISMATCH_POST"].includes(r.classification)
    )
    .map((r) => r.db.id);

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} entries (EXCEL_MISMATCH + PROBABLE_DUPLICATE + MISMATCH_POST)...`);
    const { error } = await supabase.from("bmwic_entries").delete().in("id", toDelete);
    if (error) {
      console.error(`  ✗ Delete failed: ${error.message}`);
    } else {
      console.log(`  ✓ Deleted ${toDelete.length} entries`);
    }
  }

  // Insert missing Excel entries
  if (missingFromDb.length > 0) {
    console.log(`\nInserting ${missingFromDb.length} missing Excel entries...`);
    for (const gt of missingFromDb) {
      const { error } = await supabase.from("bmwic_entries").insert({
        forum_username: gt.username, // original casing from Excel
        model_year: gt.model_year,
        body_style: gt.body_style,
        competition: gt.competition,
        drivetrain: gt.drivetrain,
        transmission: gt.drivetrain === "RWD" ? "Automatic" : "Automatic",
        ext_color: gt.ext_color,
        location_state: gt.location,
        location_country: gt.location === "British Columbia" ? "Canada" : "United States",
        source_forum: "BimmerPost",
        notes: "Imported from hand-typed Excel ground truth",
      });
      if (error) {
        console.error(`  ✗ Insert failed for @${gt.username} ${gt.ext_color}: ${error.message}`);
      } else {
        console.log(`  ✓ Inserted: @${gt.username} ${gt.model_year} ${gt.body_style} — ${gt.ext_color}`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
