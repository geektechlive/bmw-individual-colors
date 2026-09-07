/**
 * BMW Individual Colors — Database Normalizer
 *
 * Applies a fixed set of idempotent normalization rules to bmwic_entries:
 *   1. transmission: Automatic/Auto/DCT → 8AT; Manual → 6MT
 *   2. location_country: USA/US/U.S./United States of America → United States;
 *      UK/England → United Kingdom
 *   3. wheels: normalize() ported verbatim from scripts/normalize-wheels.ts
 *   4. location_state = 'Germany' AND location_country = 'United States'
 *      → country 'Germany', state null
 *   5. Suspicious rows (model_year > 2028 or forum_username shorter than 2
 *      chars): never deleted — flag_count is incremented and a marker is
 *      appended to notes (skipped if the marker is already present).
 *
 * Run:  npx tsx scripts/normalize-db.ts             # dry-run (default)
 *       npx tsx scripts/normalize-db.ts --apply      # write changes
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

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;
const PAGE_SIZE = 1000;
const SUSPICIOUS_MARKER = ' [auto-flagged: suspicious value]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Row {
  id: string;
  transmission: string | null;
  location_country: string | null;
  location_state: string | null;
  wheels: string | null;
  model_year: number | null;
  forum_username: string | null;
  flag_count: number | null;
  notes: string | null;
}

// ─── Rule 3: wheels normalizer, ported verbatim from normalize-wheels.ts ──────

function normalizeWheels(raw: string | null): string | null {
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

// ─── Rule 1: transmission ─────────────────────────────────────────────────────

function normalizeTransmission(raw: string | null): string | null {
  if (!raw) return raw;
  const s = raw.trim().toLowerCase();
  if (s === 'automatic' || s === 'auto' || s === 'dct') return '8AT';
  if (s === 'manual') return '6MT';
  return raw;
}

// ─── Rule 2: location_country synonyms ────────────────────────────────────────

const US_SYNONYMS = new Set(['usa', 'us', 'u.s.', 'united states of america']);
const UK_SYNONYMS = new Set(['uk', 'england']);

function normalizeCountrySynonym(raw: string | null): string | null {
  if (!raw) return raw;
  const s = raw.trim().toLowerCase();
  if (US_SYNONYMS.has(s)) return 'United States';
  if (UK_SYNONYMS.has(s)) return 'United Kingdom';
  return raw;
}

// ─── Fetch all rows, paged ─────────────────────────────────────────────────────

async function fetchAllRows(): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('bmwic_entries')
      .select(
        'id, transmission, location_country, location_state, wheels, model_year, forum_username, flag_count, notes'
      )
      .is('deleted_at', null)
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch entries (range ${from}-${to}): ${error.message}`);
    }
    if (!data || data.length === 0) break;

    rows.push(...(data as Row[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

// ─── Rule application ──────────────────────────────────────────────────────────

interface FieldChange {
  id: string;
  from: unknown;
  to: unknown;
}

interface RuleResult {
  name: string;
  changes: FieldChange[];
  // For rule 3 only: cases where normalize() turned a non-null value into
  // null. These are still applied (normalize() judged them too vague to
  // keep) but are called out separately in the report, per spec.
  nulledOut?: FieldChange[];
  updates: { id: string; patch: Record<string, unknown> }[];
}

function buildRules(rows: Row[]): RuleResult[] {
  const results: RuleResult[] = [];

  // Rule 1: transmission
  const transmissionChanges: FieldChange[] = [];
  const transmissionUpdates: RuleResult['updates'] = [];
  for (const row of rows) {
    const to = normalizeTransmission(row.transmission);
    if (to !== row.transmission) {
      transmissionChanges.push({ id: row.id, from: row.transmission, to });
      transmissionUpdates.push({ id: row.id, patch: { transmission: to } });
    }
  }
  results.push({ name: 'transmission', changes: transmissionChanges, updates: transmissionUpdates });

  // Rule 2: location_country synonyms
  const countryChanges: FieldChange[] = [];
  const countryUpdates: RuleResult['updates'] = [];
  for (const row of rows) {
    const to = normalizeCountrySynonym(row.location_country);
    if (to !== row.location_country) {
      countryChanges.push({ id: row.id, from: row.location_country, to });
      countryUpdates.push({ id: row.id, patch: { location_country: to } });
    }
  }
  results.push({ name: 'location_country synonyms', changes: countryChanges, updates: countryUpdates });

  // Rule 3: wheels — never null out a previously non-null value unless
  // normalize() itself returns null; report those cases separately.
  const wheelsChanges: FieldChange[] = [];
  const wheelsSuppressed: FieldChange[] = [];
  const wheelsUpdates: RuleResult['updates'] = [];
  for (const row of rows) {
    if (row.wheels == null) continue;
    const to = normalizeWheels(row.wheels);
    if (to === row.wheels) continue;
    if (to === null) {
      // normalize() itself decided this value is too vague — this is an
      // intentional null from the ported function, not a bug, but it's
      // still a non-null → null transition, so report it separately.
      wheelsSuppressed.push({ id: row.id, from: row.wheels, to });
      wheelsUpdates.push({ id: row.id, patch: { wheels: to } });
    } else {
      wheelsChanges.push({ id: row.id, from: row.wheels, to });
      wheelsUpdates.push({ id: row.id, patch: { wheels: to } });
    }
  }
  results.push({
    name: 'wheels',
    changes: wheelsChanges,
    nulledOut: wheelsSuppressed,
    updates: wheelsUpdates,
  });

  // Rule 4: location_state = 'Germany' AND location_country = 'United States'
  //   → country 'Germany', state null
  const germanyChanges: FieldChange[] = [];
  const germanyUpdates: RuleResult['updates'] = [];
  for (const row of rows) {
    if (row.location_state === 'Germany' && row.location_country === 'United States') {
      germanyChanges.push({
        id: row.id,
        from: { location_state: row.location_state, location_country: row.location_country },
        to: { location_state: null, location_country: 'Germany' },
      });
      germanyUpdates.push({
        id: row.id,
        patch: { location_state: null, location_country: 'Germany' },
      });
    }
  }
  results.push({ name: 'location_state="Germany" misfile', changes: germanyChanges, updates: germanyUpdates });

  // Rule 5: suspicious rows — flag, never delete
  const suspiciousChanges: FieldChange[] = [];
  const suspiciousUpdates: RuleResult['updates'] = [];
  for (const row of rows) {
    const isFutureYear = typeof row.model_year === 'number' && row.model_year > 2028;
    const isShortUsername =
      row.forum_username != null && row.forum_username.trim().length < 2;
    if (!isFutureYear && !isShortUsername) continue;

    const notes = row.notes ?? '';
    if (notes.includes(SUSPICIOUS_MARKER.trim())) continue; // already flagged

    const newFlagCount = (row.flag_count ?? 0) + 1;
    const newNotes = notes + SUSPICIOUS_MARKER;
    suspiciousChanges.push({
      id: row.id,
      from: { flag_count: row.flag_count ?? 0, notes: row.notes },
      to: { flag_count: newFlagCount, notes: newNotes },
    });
    suspiciousUpdates.push({
      id: row.id,
      patch: { flag_count: newFlagCount, notes: newNotes },
    });
  }
  results.push({ name: 'suspicious rows (flagged, not deleted)', changes: suspiciousChanges, updates: suspiciousUpdates });

  return results;
}

// ─── Apply ─────────────────────────────────────────────────────────────────────

async function applyUpdates(updates: { id: string; patch: Record<string, unknown> }[]): Promise<number> {
  let applied = 0;
  for (const { id, patch } of updates) {
    const { error } = await supabase.from('bmwic_entries').update(patch).eq('id', id);
    if (error) {
      console.error(`  Failed to update ${id}:`, error.message);
    } else {
      applied++;
    }
  }
  return applied;
}

// ─── Reporting ─────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY (writing changes)'}\n`);
  console.log('Fetching all entries (deleted_at is null)...');
  const rows = await fetchAllRows();
  console.log(`Fetched ${rows.length} rows.\n`);

  const results = buildRules(rows);

  for (const result of results) {
    console.log(`── ${result.name} ──`);
    if (result.changes.length === 0 && (!result.nulledOut || result.nulledOut.length === 0)) {
      console.log('  (no changes)');
    }
    for (const c of result.changes) {
      console.log(`  ${c.id}: ${formatValue(c.from)} → ${formatValue(c.to)}`);
    }
    if (result.nulledOut && result.nulledOut.length > 0) {
      console.log(`  Non-null → null transitions (still applied; normalize() judged these too vague):`);
      for (const c of result.nulledOut) {
        console.log(`    ${c.id}: ${formatValue(c.from)} → ${formatValue(c.to)}`);
      }
    }
    console.log();
  }

  console.log('══════════════════════════════════════');
  console.log('  Summary');
  console.log('══════════════════════════════════════');
  const summaryRows = results.map((r) => ({
    rule: r.name,
    would_change: r.updates.length,
  }));
  for (const row of summaryRows) {
    console.log(
      `  ${row.rule}: ${row.would_change} row${row.would_change === 1 ? '' : 's'} ${DRY_RUN ? 'would change' : 'changed'}`
    );
  }
  const total = summaryRows.reduce((sum, r) => sum + r.would_change, 0);
  console.log(`  TOTAL: ${total}`);
  console.log('══════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('[DRY RUN] No changes written. Re-run with --apply to write.');
    return;
  }

  for (const result of results) {
    if (result.updates.length === 0) continue;
    console.log(`Applying "${result.name}" (${result.updates.length} rows)...`);
    const applied = await applyUpdates(result.updates);
    console.log(`  ${applied}/${result.updates.length} applied.`);
  }
  console.log('\nDone.');
}

main().catch((err: Error) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
