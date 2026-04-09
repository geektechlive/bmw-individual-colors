/**
 * Normalizes color names in seed-data.json before import.
 * Run: npx tsx scripts/normalize-colors.ts
 */

import * as fs from "fs";
import * as path from "path";

const FILE = path.join(__dirname, "seed-data.json");

// Map of raw → canonical name
// Rules: Title Case, Grey not Gray, no paint codes, no German aliases,
// no extra notes, no "Individual" prefix, strip "Metallic" duplicates
const COLOR_MAP: Record<string, string> = {
  // Casing fixes
  "Voodoo blue": "Voodoo Blue",
  "Santorini blue": "Santorini Blue",
  "Snapper rocks blue": "Snapper Rocks Blue",
  "Enzian blue": "Enzian Blue",
  "Twilight purple": "Twilight Purple",
  "Violet blue": "Violet Blue",

  // Abbreviations / shorthand
  "FDG": "Frozen Dark Grey",

  // Gray → Grey
  "Frozen Dark Gray": "Frozen Dark Grey",

  // Strip extra notes / modifiers
  "Verde Ermes / with external carbon pack.": "Verde Ermes",
  "Marina Bay Blue, body colour roof": "Marina Bay Blue",
  "Twilight Purple P28": "Twilight Purple",   // P28 = paint code
  "Velvet Blue 379": "Velvet Blue",            // 379 = paint code
  "Tanzanite Blue II Metallic": "Tanzanite Blue II",
  "Frozen Dark Grey Metallic": "Frozen Dark Grey",

  // Collapse Pearl/Metallic suffixes that refer to the same color
  "Grigio Telesto Pearl": "Grigio Telesto",
  "Atlantis Metallic": "Atlantis Blue Metallic",

  // German / bilingual aliases
  "Gentian Blue Metallic / Enzianblau Metallic": "Gentian Blue Metallic",
  '&#34;Grau Schwarz&#34; A.K.A GreyBlack': "Grey Black",

  // Redundant "Individual" prefix
  "Individual San Marino Blue": "San Marino Blue",

  // GreyBlack spacing
  "GreyBlack": "Grey Black",
};

const data = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Array<{ ext_color: string }>;

let changed = 0;
const remaining = new Set<string>();

for (const entry of data) {
  const canonical = COLOR_MAP[entry.ext_color];
  if (canonical) {
    entry.ext_color = canonical;
    changed++;
  } else {
    remaining.add(entry.ext_color);
  }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

console.log(`✓ Normalized ${changed} entries.`);
console.log(`\nColors that passed through unchanged:`);
[...remaining].sort().forEach((c) => console.log(`  ${c}`));

// Print final unique color list
const final = [...new Set(data.map((e) => e.ext_color))].sort();
console.log(`\nFinal unique colors (${final.length}):`);
final.forEach((c) => console.log(`  ${c}`));
