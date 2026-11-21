/**
 * Generates src/lib/paint-reference.ts and src/lib/paint-redirects.ts (#93, #89) from
 *   data/bmw-individual-paints-<date>.json   BMW's own paint list (see scripts/trim-bmw-snapshot.ts)
 *   data/paint-rulings.json                  the owner's naming rulings, aliases, unverified names
 *
 * ADR 0019: the paint CODE is the identity; the display name is BMW's English name with the
 * "BMW Individual " and "M " prefixes and a trailing " Uni" removed. A BMW US document wins
 * where it differs from the visualizer; names with no BMW source stay as typed, unverified.
 * Nothing under src/ reads data/: this script is the only reader, so the Worker stays small.
 *
 *   npx tsx scripts/gen-paint-reference.ts [snapshot-date]     (default: the newest snapshot)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface SnapshotPaint { code: string; name: string; effect: string; hex: string; mainColor: string; g8x: string[] }
interface SnapshotArchived { code: string; name: string; effect: string; url: string }
interface Snapshot { fetched: string; paints: SnapshotPaint[]; archived: SnapshotArchived[] }
interface Unverified { name: string; aliases?: string[]; hex?: string; family?: string; note: string; noteSource: string; noteUrl: string }
interface Rulings {
  usDocuments: Record<string, { name: string; label: string; url: string }>;
  nameOverrides: Record<string, string>;
  aliases: Record<string, string>;
  archivedColors: Record<string, { hex: string; family: string }>;
  /** Display hex that replaces BMW's where BMW's fails the 4.5:1 label contrast on the paint wash. */
  hexOverrides: Record<string, string>;
  unverified: Unverified[];
  familyByMainColor: Record<string, string>;
  legacyCatalog: Record<string, { hex: string; family: string }>;
}
type Source = 'bmw' | 'archived' | 'us-doc' | 'unverified';
interface Ref { code?: string; hex: string; family: string; source: Source; url?: string; note?: string; noteSource?: string; noteUrl?: string }

const root = process.cwd();
const dataDir = join(root, 'data');
const date =
  process.argv[2] ??
  readdirSync(dataDir)
    .map((f) => /^bmw-individual-paints-(\d{4}-\d{2}-\d{2})\.json$/.exec(f)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
if (!date) throw new Error('no data/bmw-individual-paints-<date>.json snapshot');

const snapshot = JSON.parse(readFileSync(join(dataDir, `bmw-individual-paints-${date}.json`), 'utf8')) as Snapshot;
const rulings = JSON.parse(readFileSync(join(dataDir, 'paint-rulings.json'), 'utf8')) as Rulings;

/** Ruling 1: drop the brand prefixes and a trailing "Uni" (it only means solid). */
function displayName(raw: string): string {
  return raw.replace(/^BMW Individual /, '').replace(/^M /, '').replace(/ Uni$/, '');
}

/** Must match colorToSlug in src/lib/colors.ts for names with letters (tests/unit/legacy-slugs.test.ts proves it). */
function slug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const aliasesByCode = new Map<string, string[]>();
for (const [old, code] of Object.entries(rulings.aliases)) {
  aliasesByCode.set(code, [...(aliasesByCode.get(code) ?? []), old]);
}

/** Existing catalog hex and family win (no visual churn); the paint's own old names come second. */
function legacyFor(name: string, code: string): { hex: string; family: string } | undefined {
  for (const candidate of [name, ...(aliasesByCode.get(code) ?? [])]) {
    const found = Object.hasOwn(rulings.legacyCatalog, candidate) ? rulings.legacyCatalog[candidate] : undefined;
    if (found) return found;
  }
  return undefined;
}

const refs = new Map<string, Ref>();
const nameByCode = new Map<string, string>();

function add(name: string, ref: Ref): void {
  const existing = refs.get(name);
  if (!existing) {
    refs.set(name, ref);
    return;
  }
  // Two BMW codes sold under one English name (X16 and W93): one entry, both codes.
  if (existing.source !== ref.source) throw new Error(`${name}: two sources`);
  existing.code = `${existing.code}, ${ref.code}`;
}

for (const p of snapshot.paints) {
  const us = Object.hasOwn(rulings.usDocuments, p.code) ? rulings.usDocuments[p.code] : undefined;
  const name = us?.name ?? rulings.nameOverrides[p.code] ?? displayName(p.name);
  const legacy = legacyFor(name, p.code);
  const family = legacy?.family ?? rulings.familyByMainColor[p.mainColor];
  if (!family) throw new Error(`${p.code} ${name}: no family for mainColor ${p.mainColor}`);
  nameByCode.set(p.code, name);
  add(name, {
    code: p.code,
    // Frozen paints take BMW's hex over the old catalog's: the old values were drawn paler
    // than the paint (P9C Frozen Preciosa Red showed as pink, #98).
    hex: rulings.hexOverrides[name] ?? (p.effect === 'frozen' ? undefined : legacy?.hex) ?? p.hex,
    family,
    source: us ? 'us-doc' : 'bmw',
    ...(us ? { url: us.url } : {}),
  });
}

for (const a of snapshot.archived) {
  const name = rulings.nameOverrides[a.code] ?? displayName(a.name);
  const legacy = legacyFor(name, a.code);
  const approx = Object.hasOwn(rulings.archivedColors, a.code) ? rulings.archivedColors[a.code] : undefined;
  const chosen = legacy ?? approx;
  if (!chosen) throw new Error(`${a.code} ${name}: archived paint needs a legacy or archivedColors hex`);
  nameByCode.set(a.code, name);
  add(name, { code: a.code, hex: chosen.hex, family: chosen.family, source: 'archived', url: a.url });
}

for (const u of rulings.unverified) {
  if (refs.has(u.name)) throw new Error(`${u.name} is unverified but BMW lists it`);
  const legacy = Object.hasOwn(rulings.legacyCatalog, u.name) ? rulings.legacyCatalog[u.name] : undefined;
  const hex = u.hex ?? legacy?.hex;
  const family = u.family ?? legacy?.family;
  if (!hex || !family) throw new Error(`${u.name}: no hex or family`);
  refs.set(u.name, { hex, family, source: 'unverified', note: u.note, noteSource: u.noteSource, noteUrl: u.noteUrl });
}

// One page per slug, and aliases never shadow a listed paint.
const slugs = new Map<string, string>();
for (const name of refs.keys()) {
  const s = slug(name);
  if (slugs.has(s)) throw new Error(`${name} and ${slugs.get(s)} share slug ${s}`);
  slugs.set(s, name);
}
const aliasTargets: Array<[string, string | undefined]> = [
  ...Object.entries(rulings.aliases).map(([old, code]): [string, string | undefined] => [old, nameByCode.get(code)]),
  ...rulings.unverified.flatMap((u) => (u.aliases ?? []).map((old): [string, string | undefined] => [old, u.name])),
];
const aliases: Record<string, string> = {};
for (const [old, target] of aliasTargets) {
  if (!target) throw new Error(`alias ${old}: unknown code`);
  // "Ruby Star Neo" and BMW's "Ruby Star (NEO)" share a slug: canonicalColorName already folds
  // them by slug, the page has one URL, so no alias (and no redirect) is needed.
  if (slug(old) === slug(target)) continue;
  if (refs.has(old) || slugs.has(slug(old))) throw new Error(`alias ${old} is also a listed paint`);
  aliases[old] = target;
}

const sorted = [...refs.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));
const q = (value: string) => JSON.stringify(value);
const lines = sorted.map(([name, r]) => {
  const fields = [
    r.code ? `code: ${q(r.code)}` : null,
    `hex: ${q(r.hex)}`,
    `family: ${q(r.family)}`,
    `source: ${q(r.source)}`,
    r.url ? `url: ${q(r.url)}` : null,
    r.note ? `note: ${q(r.note)}` : null,
    r.noteSource ? `noteSource: ${q(r.noteSource)}` : null,
    r.noteUrl ? `noteUrl: ${q(r.noteUrl)}` : null,
  ].filter((f): f is string => f !== null);
  return `  ${q(name)}: { ${fields.join(', ')} },`;
});

const reference = `// GENERATED by scripts/gen-paint-reference.ts from data/bmw-individual-paints-${date}.json
// and data/paint-rulings.json. Do not edit by hand (#93, ADR 0019).
//
// The paint CODE is the identity; the name follows BMW. BMW_COLORS, COLOR_FAMILY_MAP and
// COLOR_ALIASES in colors.ts are built from this file. Hex: the catalog's existing value
// where the paint was already listed (except frozen paints, #98), else BMW's own; archived paints have no BMW hex,
// so theirs are approximations (like the rest of the catalog, for display only).

export type PaintSource = 'bmw' | 'archived' | 'us-doc' | 'unverified';

export interface PaintReference {
  /** BMW paint code; absent for unverified names. Two codes are joined with ", ". */
  readonly code?: string;
  readonly hex: string;
  readonly family: string;
  /** bmw: BMW Individual list. archived: BMW visualizer page on the Wayback Machine. us-doc: a BMW US document. */
  readonly source: PaintSource;
  /** The archived page or US document that names the paint. bmw paints cite the public list page. */
  readonly url?: string;
  readonly note?: string;
  readonly noteSource?: string;
  readonly noteUrl?: string;
}

/** The date BMW's paint list was read. */
export const PAINT_SNAPSHOT_DATE = ${q(date)};

export const PAINT_REFERENCE: Readonly<Record<string, PaintReference>> = {
${lines.join('\n')}
};

/** Old names that changed or merged: old name -> BMW display name. */
export const PAINT_ALIASES: Readonly<Record<string, string>> = {
${Object.entries(aliases).map(([old, target]) => `  ${q(old)}: ${q(target)},`).join('\n')}
};
`;

const redirects = Object.entries(aliases)
  .map(([old, target]) => [slug(old), slug(target)] as const)
  .filter(([from, to]) => from !== to);
const redirectFile = `// GENERATED by scripts/gen-paint-reference.ts (#89, #93). Do not edit by hand.
// Old paint slug -> current slug, answered with a 308 in worker.ts before the Next server loads.
// No imports on purpose: 10 ms of CPU on Workers Free leaves no room for the catalog.
// tests/unit/legacy-slugs.test.ts proves this table equals the slugs of COLOR_ALIASES.

export const PAINT_SLUG_REDIRECTS: Readonly<Record<string, string>> = {
${redirects.map(([from, to]) => `  ${q(from)}: ${q(to)},`).join('\n')}
};
`;

writeFileSync(join(root, 'src/lib/paint-reference.ts'), reference);
writeFileSync(join(root, 'src/lib/paint-redirects.ts'), redirectFile);
console.log(`${refs.size} paints (${[...refs.values()].filter((r) => r.source === 'unverified').length} unverified), ${redirects.length} redirects`);
