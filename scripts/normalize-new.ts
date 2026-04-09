/**
 * Normalizes seed-data-2041992.json and seed-data-2229924.json
 * Run: npx tsx scripts/normalize-new.ts
 */
import * as fs from "fs";
import * as path from "path";

const FILES = [
  path.join(__dirname, "seed-data-2041992.json"),
  path.join(__dirname, "seed-data-2229924.json"),
];

const COLOR_MAP: Record<string, string | null> = {
  // Abbreviations
  "LSB": "Laguna Seca Blue",

  // Casing
  "Twilight purple": "Twilight Purple",
  "twilight purple": "Twilight Purple",
  "VooDoo Blue": "Voodoo Blue",
  "sepia metallic III": "Sepia Metallic III",
  "techno violet metallic": "Techno Violet Metallic",
  "Santorin blue II": "Santorini Blue II",

  // Duplicates / near-dupes
  "Frozen Dark Grey Metallic": "Frozen Dark Grey",
  "Atlantis Metallic": "Atlantis Blue Metallic",
  "Anglesey Green": "Anglesey Green Metallic",
  "Blue Bay Lagoon": "Blue Bay Lagoon Metallic",
  "San Marino Blue Metallic": "San Marino Blue",
  "Dravit Grey": "Dravit Grey Metallic",
  "Gentian Blue": "Gentian Blue Metallic",
  "Oxford Green Metallic": "Oxford Green II Metallic",
  "Oxford Green Metallic II": "Oxford Green II Metallic",
  "Lime Rock Grey Metallic C39": "Lime Rock Grey",

  // Spelling fixes
  "Goodwood Grean Pearl": "Goodwood Green Pearl",

  // Parser errors — drop these entries entirely
  "Individual Color": null,
  "Interior Color: Tartufo Full Leather": null,
  "Silverstone/Black Full Merino Leather": null,
};

for (const file of FILES) {
  if (!fs.existsSync(file)) { console.warn(`Missing: ${file}`); continue; }

  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as Array<{ ext_color: string }>;
  const before = data.length;
  const normalized: typeof data = [];

  for (const entry of data) {
    const mapped = COLOR_MAP[entry.ext_color];
    if (mapped === null) continue; // drop
    if (mapped !== undefined) entry.ext_color = mapped;
    normalized.push(entry);
  }

  fs.writeFileSync(file, JSON.stringify(normalized, null, 2));
  console.log(`${path.basename(file)}: ${before} → ${normalized.length} entries`);

  const colors = [...new Set(normalized.map((e) => e.ext_color))].sort();
  console.log(`  ${colors.length} unique colors: ${colors.join(", ")}`);
  console.log();
}
