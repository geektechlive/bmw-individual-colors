/**
 * BMW Individual Colors — Wheel Normalizer
 *
 * Normalizes the `wheels` field in bmwic_entries to a canonical set of
 * G80/G82-era wheel style names, collapsing the many community spelling
 * variants scraped from forum posts into consistent values.
 *
 * Run:  npx tsx scripts/normalize-wheels.ts
 * Flags:
 *   --dry-run   Print what would change without writing to DB
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Normalization rules — order matters: more specific patterns first.
// Returns null to nullify the field (too vague to be useful).
function normalize(raw: string | null): string | null {
  if (!raw) return null;

  // Strip out caliper commentary (e.g. "w/ Red Calipers", ", Blue Brake Calipers")
  const cleaned = raw
    .replace(/,?\s*(w\/|with)\s*(red|blue|orange|yellow|black|white|gold|silver)?\s*(brake\s+)?calipers?.*/i, '')
    .replace(/,?\s*(red|blue|orange|yellow|black|white|gold|silver)\s+(brake\s+)?calipers?.*/i, '')
    .replace(/\s+black\s+wheels?$/i, '')
    .replace(/\s*\d+"\s*\/?\s*\d*"?/g, '')  // strip 19"/20" size info
    .replace(/&#34;/g, '')
    // Handle "Black 826M" prefix form → just "826M"
    .replace(/^black\s+/i, '')
    .trim();

  const s = cleaned.toLowerCase().replace(/[-\s]+/g, '');

  // 826M variants
  if (/^826m?$/.test(s)) return '826M';
  if (/^826m(jet)?black$/.test(s)) return '826M';
  if (/^826mboblack$/.test(s)) return '826M';      // "bo-Black" typo
  if (/^826mdoublespoke(black)?$/.test(s)) return '826M';
  if (/^826mdualspoke(black)?$/.test(s)) return '826M';
  if (/^826mblack(bi|double)(color|colour)/.test(s)) return '826M Bi-Color'; // "826M Black Bi-Color"
  if (/^826m(bi|double)(color|colour|spoke)/.test(s)) return '826M Bi-Color';
  if (/^bicolor826m$/.test(s)) return '826M Bi-Color';
  if (/^826mbicolor(black)?$/.test(s)) return '826M Bi-Color';

  // 825M variants
  if (/^825m$/.test(s)) return '825M';
  if (/^825m(jet)?black$/.test(s)) return '825M';
  if (/^825m(bi|bi)(color|colour)$/.test(s)) return '825M Bi-Color';
  if (/^bicolor825m$/.test(s)) return '825M Bi-Color';
  if (/^825msilver$/.test(s)) return '825M Silver';
  if (/^825m?orbitgr[ae]y$/.test(s)) return '825M Orbit Grey';
  if (/^925m?orbitgr[ae]y$/.test(s)) return '825M Orbit Grey'; // common typo
  if (/^825orbitgr[ae]y$/.test(s)) return '825M Orbit Grey';
  if (/^825bi(color|colour)$/.test(s)) return '825M Bi-Color';

  // 824M
  if (/^824m?(orbitgr[ae]y)?$/.test(s)) return '824M';

  // 827M (CS/CSL)
  if (/^827m/.test(s)) return '827M';

  // 930M
  if (/^930m/.test(s)) return '930M';

  // 963M
  if (/^963m/.test(s)) return '963M';

  // 1000M
  if (/^1000m(gold|bronze|frozen)?.*(gold|bronze)?$/.test(s)) {
    if (/gold|bronze/.test(s)) return '1000M Gold/Bronze';
    return '1000M';
  }

  // Too vague — nullify
  if (/^\d{2,2}\/\d{2,2}$/.test(s)) return null;  // "18/19" etc.
  if (/^[0-9"]+$/.test(s)) return null;

  // Unrecognized but non-trivial — keep as "Other"
  return 'Other';
}

async function main() {
  const { data: entries, error } = await supabase
    .from('bmwic_entries')
    .select('id, wheels')
    .not('wheels', 'is', null);

  if (error || !entries) {
    console.error('Failed to fetch entries:', error);
    process.exit(1);
  }

  const changes: { id: string; from: string; to: string | null }[] = [];

  for (const entry of entries) {
    const canonical = normalize(entry.wheels);
    if (canonical !== entry.wheels) {
      changes.push({ id: entry.id, from: entry.wheels, to: canonical });
    }
  }

  // Group for readability
  const grouped = new Map<string, { to: string | null; count: number }>();
  for (const c of changes) {
    const key = `${c.from} → ${c.to ?? 'null'}`;
    grouped.set(key, { to: c.to, count: (grouped.get(key)?.count ?? 0) + 1 });
  }

  console.log(`\nFound ${changes.length} entries to normalize (${entries.length} total with wheels):\n`);
  for (const [label, { count }] of [...grouped.entries()].sort()) {
    console.log(`  ${count}x  ${label}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written.');
    return;
  }

  console.log('\nApplying changes...');
  let updated = 0;
  for (const { id, to } of changes) {
    const { error: updateError } = await supabase
      .from('bmwic_entries')
      .update({ wheels: to })
      .eq('id', id);
    if (updateError) {
      console.error(`  Failed to update ${id}:`, updateError.message);
    } else {
      updated++;
    }
  }

  console.log(`Done. ${updated}/${changes.length} entries updated.`);
}

main();
