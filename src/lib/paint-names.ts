// Pure helpers that keep one display name per paint slug (#55). No server-only imports,
// so they are unit-testable; queries.ts applies them to the registry.

import { canonicalColorName, catalogNameForSlug, colorToSlug } from './colors';

/**
 * The name a `/colors/<slug>` page is for. The catalog name wins when one matches the
 * slug, so a look-alike like "Twilight-Purple" can never shadow "Twilight Purple".
 * Otherwise the first registry name that slugs to it; null when nothing matches.
 */
export function pickNameForSlug(slug: string, registryNames: Iterable<string>): string | null {
  const normalized = slug.toLowerCase();
  const catalog = catalogNameForSlug(normalized);
  if (catalog) return catalog;
  for (const name of registryNames) {
    if (colorToSlug(name) === normalized) return canonicalColorName(name);
  }
  return null;
}

/**
 * Maps every distinct stored paint name to ONE display name per slug, so listings
 * (keyed by slug) can't get two items with the same key. Catalog names win; between
 * non-catalog look-alikes the most common spelling wins, ties alphabetical, so the
 * result doesn't depend on row order. Pass every row's name, repeats included.
 */
export function mergePaintNames(names: readonly string[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const raw of names) {
    const name = canonicalColorName(raw);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const winners = new Map<string, string>();
  for (const [name, n] of counts) {
    const slug = colorToSlug(name);
    const best = winners.get(slug);
    if (best === undefined) {
      winners.set(slug, name);
      continue;
    }
    const bestN = counts.get(best) ?? 0;
    if (n > bestN || (n === bestN && name < best)) winners.set(slug, name);
  }
  const result = new Map<string, string>();
  for (const raw of new Set(names)) {
    const canonical = canonicalColorName(raw);
    result.set(raw, winners.get(colorToSlug(canonical)) ?? canonical);
  }
  return result;
}
