/**
 * BMW Individual Colors — Forum Scraper
 *
 * Fetches all pages of https://g80.bimmerpost.com/forums/showthread.php?t=1835705
 * and parses individual car entries into structured JSON.
 *
 * Run: npx tsx scripts/seed-forum.ts
 * Output: scripts/seed-data.json (review before importing)
 */

import * as fs from "fs";
import * as path from "path";

// Usage: npx tsx scripts/seed-forum.ts [threadId] [pages]
// Defaults to original thread if no args given
const THREAD_ID = process.argv[2] ?? "1835705";
const TOTAL_PAGES = parseInt(process.argv[3] ?? "36", 10);
const THREAD_URL = `https://g80.bimmerpost.com/forums/showthread.php?t=${THREAD_ID}`;
const DELAY_MS = 1500;
const OUTPUT_FILE = path.join(__dirname, `seed-data-${THREAD_ID}.json`);

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedEntry {
  model_year: number;
  body_style: "M3" | "M4";
  competition: boolean;
  drivetrain: "AWD" | "RWD";
  transmission: "DCT" | "6MT";
  ext_color: string;
  interior_color: string | null;
  interior_type: string | null;
  wheels: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string;
  forum_username: string | null;
  notes: string | null;
  _raw?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, "")         // strip carriage returns (Windows \r\n → \n)
    .replace(/[ \t]+/g, " ")    // collapse spaces/tabs but preserve newlines
    .replace(/\n[ \t]+/g, "\n") // strip leading spaces from each line
    .trim();
}

async function fetchPage(page: number): Promise<string> {
  const url = page === 1 ? THREAD_URL : `${THREAD_URL}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  return res.text();
}

// ── Post extraction ───────────────────────────────────────────────────────────

interface RawPost {
  postId: string;
  username: string;
  html: string;
  text: string;
}

function extractPosts(html: string): RawPost[] {
  const posts: RawPost[] = [];

  // Match the outer post div: id="post12345678"
  // BimmerPost vBulletin structure: each post is wrapped in a div with id="postNUMBER"
  const postBlockRe = /id="(post(\d+))"[\s\S]*?(?=id="post\d+"|$)/g;

  // Simpler approach: split by post message divs
  // Each message is: <div id="post_message_XXXXXXXX" class="thePostItself">...</div>
  const msgRe = /id="post_message_(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*\/\s*message/g;
  const userRe = /id="post(\d+)"[\s\S]*?class="bigusername"[^>]*>([^<]+)<\/a>/g;

  // Build a map of postId → username first
  const usernameMap = new Map<string, string>();
  let um: RegExpExecArray | null;
  while ((um = userRe.exec(html)) !== null) {
    usernameMap.set(um[1], um[2].trim());
  }

  // Extract each post message
  let mm: RegExpExecArray | null;
  while ((mm = msgRe.exec(html)) !== null) {
    const postId = mm[1];
    const rawHtml = mm[2];
    const text = decodeHtml(rawHtml);
    posts.push({
      postId,
      username: usernameMap.get(postId) ?? "unknown",
      html: rawHtml,
      text,
    });
  }

  return posts;
}

// ── Entry parsing ─────────────────────────────────────────────────────────────

// BimmerPost entries use bold labels: <b>MY</b>:2022 or <b>MY</b> : 2022
// After HTML stripping this becomes: "MY :2022" or "MY: 2022"
// We parse the plain text version.
const FIELDS: Array<{ keys: string[]; field: string }> = [
  { keys: ["MY", "Model Year", "Year"], field: "model_year" },
  // MY27 uses "Model (M3/M4 & Base/Comp/CompX)" — key matched as prefix up to colon
  { keys: ["Type", "Model", "Model (M3"], field: "type" },
  {
    keys: [
      "Exterior Color",
      "Individual color",
      "Individual Color",
      "Ext color",
      "Color",
      "Ext Color",
      "Individual Colour",
    ],
    field: "ext_color",
  },
  {
    keys: ["Interior Color", "Interior color", "Interior", "Interior Colour"],
    field: "interior",
  },
  // MY27 uses "Location (Country)" — key matched as prefix up to colon
  { keys: ["Location (Country)", "Location", "Location/Region", "Region", "State"], field: "location" },
  { keys: ["Wheels", "Wheel"], field: "wheels" },
];

function extractFields(text: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const { keys, field } of FIELDS) {
    for (const key of keys) {
      // Match "Key : Value" or "Key: Value" (case-insensitive, with optional spaces)
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // [^:\n]* allows extra text between key prefix and colon (e.g. "Model (M3/M4 & Base/Comp/CompX):")
      const re = new RegExp(`(?:^|\\n)\\s*${escaped}[^:\\n]*:+\\s*(.+?)(?=\\n|$)`, "i");
      const m = re.exec(text);
      if (m && m[1].trim()) {
        result[field] = m[1].trim();
        break;
      }
    }
  }

  return result;
}

/**
 * Returns null if the type string is not an M3 or M4.
 * Rejects M3 CS, M4 CSL, M2, M5, M8, X-series, etc.
 */
function parseModelType(typeStr: string): {
  body_style: "M3" | "M4";
  competition: boolean;
  drivetrain: "AWD" | "RWD";
  transmission: "DCT" | "6MT";
} | null {
  const t = typeStr.toUpperCase();

  // Must contain M3 or M4 (as a word boundary, not M30/M40/M2/M5/etc.)
  const hasM3 = /\bM3\b/.test(t);
  const hasM4 = /\bM4\b/.test(t);
  if (!hasM3 && !hasM4) return null;

  // Reject M3 CS, M4 CSL, M3 GTS, M4 GT4 — special variants, not standard Individual builds
  if (/\bCS\b|\bCSL\b|\bGTS\b|\bGT4\b|\bGT3\b/.test(t)) return null;

  const body_style: "M3" | "M4" = hasM4 ? "M4" : "M3";
  const competition =
    t.includes("COMPETITION") ||
    t.includes("M3C") ||
    t.includes("M4C") ||
    t.includes(" C ") ||
    t.includes("COMP");
  const drivetrain: "AWD" | "RWD" =
    t.includes("AWD") || t.includes("XDRIVE") || t.includes("X-DRIVE") || t.includes("X DRIVE") || t.includes("COMPX")
      ? "AWD"
      : "RWD";
  const transmission: "DCT" | "6MT" =
    t.includes("6MT") || t.includes("MANUAL") || t.includes("6 MT") || t.includes("6-MT") ||
    (t.includes("MT") && !t.includes("AWD") && !t.includes("XDRIVE"))
      ? "6MT"
      : "DCT";
  return { body_style, competition, drivetrain, transmission };
}

function parseLocation(locStr: string): {
  location_city: string | null;
  location_state: string | null;
  location_country: string;
} {
  const s = locStr.trim().replace(/\s+/g, " ");

  const nonUSCountries = [
    "Australia",
    "Canada",
    "UK",
    "United Kingdom",
    "Germany",
    "France",
    "Netherlands",
    "New Zealand",
    "NZ",
    "Sweden",
    "Norway",
    "Denmark",
    "Japan",
    "China",
    "Singapore",
    "Hong Kong",
  ];

  for (const c of nonUSCountries) {
    if (s.toLowerCase().includes(c.toLowerCase())) {
      const parts = s.split(/,\s*/);
      return {
        location_city: parts[0]?.trim() || null,
        location_state: parts.length > 2 ? parts[1]?.trim() : null,
        location_country: c === "UK" ? "United Kingdom" : c === "NZ" ? "New Zealand" : c,
      };
    }
  }

  const parts = s.split(/,\s*/);
  return {
    location_city: parts[0]?.trim() || null,
    location_state: parts[1]?.trim() || null,
    location_country: "USA",
  };
}

function parseInterior(interiorStr: string): {
  interior_color: string | null;
  interior_type: string | null;
} {
  const s = interiorStr.trim();
  const lower = s.toLowerCase();

  const type =
    lower.includes("carbon") || lower.includes("bucket")
      ? "Carbon Buckets"
      : "Full Leather";

  // Strip parenthetical notes and type keywords to get color name
  const color = s
    .replace(/\(full\s*leather\)/i, "")
    .replace(/\(carbon\s*buckets?\)/i, "")
    .replace(/full\s*leather/i, "")
    .replace(/merino\s*leather/i, "")
    .replace(/carbon\s*buckets?/i, "")
    .replace(/\bmerino\b/i, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[*]+/g, "")
    .trim()
    .replace(/\s+/g, " ");

  return {
    interior_color: color || null,
    interior_type: type,
  };
}

function isEntryPost(text: string): boolean {
  const hasMY = /(?:MY|Model Year|Year)\s*:+/i.test(text);
  const hasColor = /(?:Individual\s+)?(?:Ext(?:erior)?\.?\s+)?[Cc]ol[ou]r\s*:+/i.test(text);
  const hasType = /(?:Type|Model)\s*:+/i.test(text);
  const hasBuild = /BUILD\s*:/i.test(text);

  // MY2027 format: has "Exterior Color:" + "Location (Country):" but no explicit year
  const isMY27Style = hasColor && /Location\s*\(Country\)/i.test(text);

  return hasBuild || isMY27Style || (hasMY && (hasColor || hasType));
}

// Known wheel pattern to identify the wheels bullet in BUILD: format
const WHEEL_RE = /^-?\s*(\d{3}[Mm]\b.*)/;
// Known interior keywords
const INTERIOR_KEYWORDS = /leather|merino|buckets?|tartufo|silverstone|fiona|kyalami|fjord|ivory|black|chalk/i;
// Known package/option keywords to skip
const SKIP_BULLET = /package|option|suspension|laser|shadow|seat|drive|assist|ventilat|carbon fiber trim|carbon pack|executive|parking|delivery|m performance|pio|port/i;

/**
 * Parse the MY2024-style "BUILD:" bullet format.
 * Format:
 *   BUILD:
 *   -G80/G82 [model description]
 *   -[Individual color name]
 *   -[interior description]
 *   -[wheels]
 *   -[packages/options — skip]
 */
function parseBuildSection(text: string, username: string, defaultYear: number): ParsedEntry | null {
  // Find everything after "Build:" to end of text; split on newlines, filter blanks
  const buildStart = /BUILD\s*:/i.exec(text);
  if (!buildStart) return null;

  const afterBuild = text.slice(buildStart.index + buildStart[0].length);
  const lines = afterBuild
    .split("\n")
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  // Translate G80→M3, G82→M4 chassis codes, then parse model
  const modelLine = lines[0]
    .replace(/\bG80\b/gi, "M3")
    .replace(/\bG82\b/gi, "M4");
  if (!/M3|M4/i.test(modelLine)) return null;
  const modelParts = parseModelType(modelLine);
  if (!modelParts) return null;

  // Remaining lines: find color, interior, wheels
  let ext_color = "";
  let interiorRaw = "";
  let wheelsRaw = "";

  for (const line of lines.slice(1)) {
    if (SKIP_BULLET.test(line)) continue;
    if (WHEEL_RE.test(line) && !wheelsRaw) {
      wheelsRaw = line.replace(/^[-•*\s]+/, "").trim();
      continue;
    }
    if (INTERIOR_KEYWORDS.test(line) && !interiorRaw) {
      interiorRaw = line;
      continue;
    }
    if (!ext_color && line.length > 2 && line.length < 60 && !/^\d/.test(line)) {
      ext_color = line.replace(/[*]+/g, "").trim();
    }
  }

  if (!ext_color) return null;

  // MY: try to find in text above BUILD section, else use default
  const myMatch = /(?:MY|Model Year|Year)\s*:+\s*(\d{4})/i.exec(text);
  const model_year = myMatch ? parseInt(myMatch[1], 10) : defaultYear;

  // Location: look for labeled location in full text
  const locMatch = /(?:Location|State|Country)\s*:+\s*(.+)/i.exec(text);
  const locationParts = locMatch
    ? parseLocation(locMatch[1].trim())
    : { location_city: null, location_state: null, location_country: "USA" };

  const interiorParts = interiorRaw
    ? parseInterior(interiorRaw)
    : { interior_color: null, interior_type: null };

  return {
    model_year,
    ...modelParts,
    ext_color,
    ...interiorParts,
    wheels: wheelsRaw || null,
    ...locationParts,
    forum_username: username,
    notes: null,
    _raw: text.slice(0, 600),
  };
}

// Default year inferred from thread ID (set at runtime)
let DEFAULT_YEAR = 2022;

function parseEntry(post: RawPost): ParsedEntry | null {
  if (!isEntryPost(post.text)) return null;

  // Try BUILD: format first (MY2024-style)
  if (/BUILD\s*:/i.test(post.text)) {
    return parseBuildSection(post.text, post.username, DEFAULT_YEAR);
  }

  const fields = extractFields(post.text);

  // Require at least a color or type field
  if (!fields.ext_color && !fields.type) return null;

  const year = fields.model_year ? parseInt(fields.model_year, 10) : DEFAULT_YEAR;
  if (isNaN(year) || year < 2019 || year > 2028) return null;

  const modelParts = fields.type
    ? parseModelType(fields.type)
    : { body_style: "M3" as const, competition: true, drivetrain: "AWD" as const, transmission: "DCT" as const };

  // Reject non-M3/M4 entries
  if (!modelParts) return null;

  const locationParts = fields.location
    ? parseLocation(fields.location)
    : { location_city: null, location_state: null, location_country: "USA" };

  const interiorParts = fields.interior
    ? parseInterior(fields.interior)
    : { interior_color: null, interior_type: null };

  const ext_color = (fields.ext_color || "")
    .replace(/[*]+/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();

  if (!ext_color) return null;

  return {
    model_year: year,
    ...modelParts,
    ext_color,
    ...interiorParts,
    wheels: fields.wheels?.replace(/[*]+/g, "").trim() || null,
    ...locationParts,
    forum_username: post.username,
    notes: null,
    _raw: post.text.slice(0, 600),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Set default year based on known thread IDs
  const yearByThread: Record<string, number> = {
    "1835705": 2022,
    "2041992": 2024,
    "2229924": 2027,
  };
  DEFAULT_YEAR = yearByThread[THREAD_ID] ?? 2024;

  console.log(`Scraping ${TOTAL_PAGES} pages of thread ${THREAD_ID} (default year: ${DEFAULT_YEAR})...`);

  const entries: ParsedEntry[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    process.stdout.write(`  Page ${page}/${TOTAL_PAGES}... `);
    try {
      const html = await fetchPage(page);
      const posts = extractPosts(html);
      let pageEntries = 0;

      for (const post of posts) {
        const entry = parseEntry(post);
        if (!entry) continue;

        const key = `${entry.forum_username}|${entry.ext_color}|${entry.model_year}`;
        if (seen.has(key)) continue;
        seen.add(key);

        entries.push(entry);
        pageEntries++;
      }

      console.log(`${posts.length} posts, ${pageEntries} new entries`);
    } catch (err) {
      console.error(`  ✗ Failed page ${page}:`, err);
    }

    if (page < TOTAL_PAGES) await sleep(DELAY_MS);
  }

  // Write debug file (with _raw)
  fs.writeFileSync(
    OUTPUT_FILE.replace(".json", "-debug.json"),
    JSON.stringify(entries, null, 2)
  );

  // Write clean file (without _raw)
  const clean = entries.map(({ _raw: _, ...rest }) => rest);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clean, null, 2));

  console.log(`\n✓ Done. ${clean.length} unique entries parsed.`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`  Review seed-data.json before running import.ts\n`);

  // Summary
  const colorCounts: Record<string, number> = {};
  for (const e of clean) {
    colorCounts[e.ext_color] = (colorCounts[e.ext_color] || 0) + 1;
  }
  const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  console.log("Top colors found:");
  sorted.slice(0, 20).forEach(([color, count]) => {
    console.log(`  ${String(count).padStart(3)}  ${color}`);
  });

  console.log(`\nTotal entries: ${clean.length}`);
  console.log(
    `Model year breakdown: ${[...new Set(clean.map((e) => e.model_year))].sort().join(", ")}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
