import { legacySlugTarget } from './legacy-slugs';
import { PAINT_ALIASES, PAINT_REFERENCE } from './paint-reference';

// The paint catalog (#93, ADR 0019). The paint CODE is the identity and the name follows BMW,
// so the list, hex and family live in the generated paint-reference.ts (BMW's Individual
// paint list, its archived visualizer pages, plus a few unverified names that have builds).
// Hex values are display colors: the old catalog value where the paint was already listed,
// else BMW's own; archived paints are approximations.
export const BMW_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(PAINT_REFERENCE).map(([name, ref]) => [name, ref.hex])
);

/**
 * For custom/unknown color names, infer a reasonable hex from keywords in the name.
 * "Frozen" variants get a muted/desaturated version of their base color.
 */
export function guessColorFromName(name: string): string {
  const n = name.toLowerCase();
  const isFrozen = n.includes('frozen') || n.includes('matte');

  if (/\bred\b|scarlet|crimson|carmine|corsa|ruby|preciosa|chianti|cinnabar|imola|zinnober|picasso|rosso/.test(n))
    return isFrozen ? '#c87878' : '#b01c1c';
  if (/\borange\b|sakhir|solar/.test(n))
    return isFrozen ? '#d4906a' : '#c2410c';
  if (/\byellow\b|dakar|speed\s*yellow/.test(n))
    return isFrozen ? '#d4c46a' : '#ca8a04';
  if (/\bgreen\b|verde|isle\s*of\s*man|brewster|racing\s*green|kyoto|mantis|wagon\s*green|irish\s*green|jack\s*green/.test(n))
    return isFrozen ? '#6a9c6a' : '#15803d';
  if (/\bblue\b|azure|cobalt|sapphire|portimao|tanzanite|enzian|gentian|marina|mauritius|riviera|snapper|voodoo|aegean|atlantis|eridan|laguna|monza|macao|mandalika|mugello|nurburgring|como|almeria/.test(n))
    return isFrozen ? '#6a7a9c' : '#1e3a8a';
  if (/\bpurple\b|\bviolet\b|\bwildberry\b|twilight/.test(n))
    return isFrozen ? '#8a6a9c' : '#6d28d9';
  if (/\bpink\b|\brose\b/.test(n))
    return isFrozen ? '#d49aaa' : '#db2777';
  if (/\bbronze\b|pyrite|sepang|lanzarote/.test(n))
    return '#8a6a2a';
  if (/\bgold\b|\bcopper\b/.test(n))
    return '#b45309';
  if (/\bbrown\b|\bsepia\b|\bcedar\b|almandine/.test(n))
    return '#7a4a2a';
  if (/\bsilver\b|cashmere/.test(n))
    return isFrozen ? '#c4bfb8' : '#9ca3af';
  if (/\bwhite\b|smoked\s*white|snowy/.test(n))
    return '#e0dbd5';
  if (/\bblack\b|cosmos|jerez/.test(n))
    return '#1a1a1a';
  if (/\bgrey\b|\bgray\b|nardo|oxide|dravit|grigio|gunmetal|fashion\s*grey|silicon|dolomite|turbine|himalaya|stormwater|lime\s*rock/.test(n))
    return isFrozen ? '#9a9a9a' : '#6b7280';

  return '#888888';
}

/**
 * Reads `map[key]` only when `key` is the map's own entry. Paint names are free text from an
 * anonymous form, and a plain `map[key]` would return built-ins for names like "constructor"
 * or "toString" (a function where a name or hex was expected breaks every page that lists
 * builds).
 */
export function ownValue<T>(map: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

export function getColorHex(colorName: string): string {
  return ownValue(BMW_COLORS, colorName) ?? guessColorFromName(colorName);
}

/** Every listed color has an explicit family (tests/unit/colors-validation.test.ts). */
export const COLOR_FAMILY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PAINT_REFERENCE).map(([name, ref]) => [name, ref.family])
);

export function getColorFamily(colorName: string): string {
  const known = ownValue(COLOR_FAMILY_MAP, colorName);
  if (known) return known;
  const n = colorName.toLowerCase();
  if (/\bred\b|scarlet|crimson|carmine|corsa|ruby|preciosa|chianti|cinnabar|imola|zinnober|picasso|rosso/.test(n)) return 'Reds & Oranges';
  if (/\borange\b|sakhir|solar/.test(n)) return 'Reds & Oranges';
  if (/\byellow\b|dakar|speed\s*yellow/.test(n)) return 'Yellows';
  if (/\bgreen\b|verde|isle\s*of\s*man|brewster|racing\s*green|kyoto|mantis|wagon\s*green|irish\s*green|jack\s*green/.test(n)) return 'Greens';
  if (/\bblue\b|azure|cobalt|sapphire|portimao|tanzanite|enzian|gentian|marina|mauritius|riviera|snapper|voodoo|aegean|atlantis|eridan|laguna|monza|macao|mandalika|mugello|nurburgring|como|almeria/.test(n)) return 'Blues';
  if (/\bpurple\b|\bviolet\b|\bwildberry\b|twilight/.test(n)) return 'Purples';
  if (/\bpink\b|\brose\b/.test(n)) return 'Purples';
  if (/\bblack\b|\bwhite\b|\bsilver\b|\bgrey\b|\bgray\b|\bbronze\b|\bgold\b|\bbrown\b|\bsepia\b|\bcopper\b/.test(n)) return 'Greys & Blacks';
  return 'Other';
}

/**
 * Strips control and format characters (zero-width spaces and joiners, BOM, bidi
 * overrides), then trims and collapses whitespace. Applied to every paint name on the
 * way in, so look-alikes of a catalog paint can't be stored (#55).
 */
export function cleanPaintName(name: string): string {
  return (name ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().replace(/\s+/g, ' ');
}

/** 32-bit FNV-1a as 8 hex digits: tiny, pure JS, no crypto import (Workers CPU budget). */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * URL slug for a paint name. A name with no ASCII letters or digits ("!!!", non-Latin
 * scripts) would slug to "" and link to `/colors/`, so it gets a stable `paint-<hash>`
 * slug instead (#55). Blank input stays "".
 */
export function colorToSlug(colorName: string): string {
  // Accents become their plain letter ("São" -> "sao"), not a dropped one (#75).
  const slug = colorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug) return slug;
  const cleaned = cleanPaintName(colorName).toLowerCase();
  return cleaned ? `paint-${fnv1a(cleaned)}` : '';
}

export function slugToColor(slug: string): string | null {
  // An old slug resolves to the same paint as its replacement (#75).
  const normalized = legacySlugTarget(slug) ?? slug.toLowerCase();
  return Object.keys(BMW_COLORS).find(
    name => colorToSlug(name) === normalized
  ) ?? null;
}

/** Returns true if the hex color is light enough that white text would be hard to read. */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

/**
 * Old and alternate names for a color that is listed under a different name: "Twilight Purple"
 * is BMW's "Twilight Purple Pearl effect" (P28), "Enzian Blue" is "Gentian Blue", "Fire Orange"
 * is "Fire Orange III" (#91). Key = the name as stored or typed, value = the listed name.
 * Generated from data/paint-rulings.json by scripts/gen-paint-reference.ts (#93).
 *
 * Note: wheel designations ("826M", "1000M", ...) are NOT colors and never belong here.
 */
export const COLOR_ALIASES: Record<string, string> = { ...PAINT_ALIASES };

// Lowercase lookup tables built once at module scope — canonicalColorName runs
// once per registry row per request, so per-call map construction would be hot.
const ALIAS_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_ALIASES).map(([alias, canonical]) => [alias.toLowerCase(), canonical])
);

const CANONICAL_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.keys(BMW_COLORS).map((name) => [name.toLowerCase(), name])
);

const ALIAS_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_ALIASES).map(([alias, canonical]) => [colorToSlug(alias), colorToSlug(canonical)])
);

/**
 * The canonical slug an alias slug should redirect to (e.g. "enzian-blue" →
 * "gentian-blue"), or null. Alias names aren't listed colors (#35), so their old
 * URLs redirect permanently instead of 404ing (#37).
 */
export function aliasRedirectSlug(slug: string): string | null {
  return ownValue(ALIAS_SLUG_REDIRECTS, slug.toLowerCase()) ?? null;
}

/**
 * Resolve a raw color string to its canonical BMW_COLORS name.
 * Trims and collapses whitespace, matches aliases and known colors case-insensitively,
 * and falls back to the cleaned input when the color is unknown.
 */
export function canonicalColorName(name: string): string {
  const cleaned = cleanPaintName(name);
  if (!cleaned) return cleaned;
  const key = cleaned.toLowerCase();
  const exact = ownValue(ALIAS_LOOKUP, key) ?? ownValue(CANONICAL_LOOKUP, key);
  if (exact) return exact;
  // "Twilight-Purple" and "twilight_purple" are the same paint as "Twilight Purple" (#55).
  return catalogNameForSlug(colorToSlug(cleaned)) ?? cleaned;
}

/**
 * Every spelling a stored row may carry for one paint: the listed name plus every alias that
 * points at it. Rows written before a rename keep their old ext_color (the database is not
 * rewritten, ADR 0019), so a database filter on a paint must match all of them.
 */
export function paintNameSpellings(canonicalName: string): string[] {
  const aliases = Object.entries(COLOR_ALIASES)
    .filter(([, target]) => target === canonicalName)
    .map(([alias]) => alias);
  return [canonicalName, ...aliases];
}

/** Slug → canonical catalog name, aliases included. A Map: slugs are derived from free text. */
const CATALOG_BY_SLUG: ReadonlyMap<string, string> = new Map([
  ...Object.keys(BMW_COLORS).map((n): [string, string] => [colorToSlug(n), n]),
  ...Object.entries(COLOR_ALIASES).map(([a, c]): [string, string] => [colorToSlug(a), c]),
]);

/** The catalog paint (or alias target) whose slug is `slug`, else undefined. */
export function catalogNameForSlug(slug: string): string | undefined {
  return CATALOG_BY_SLUG.get(slug);
}

// Interior upholstery colors, used to fill the interior chart bars. Data, like BMW_COLORS.
export const INTERIOR_HEX_MAP: Record<string, string> = {
  'Black': '#1a1a1a',
  'Fiona Red': '#8c1a1a',
  'Fjord Blue': '#1a3a7c',
  'Fjord Blue/Black': '#1a3a7c',
  'Kyalami Orange': '#c45a1a',
  'Sakhir Orange': '#d4661e',
  'Silverstone': '#8a8a8a',
  'Silverstone Grey': '#7a7a7a',
  'Smoke White': '#d4d0cc',
  'Tartufo Brown': '#6a3a1a',
};
