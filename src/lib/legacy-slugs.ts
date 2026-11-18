// Old color slugs that changed when colorToSlug started transliterating accents (#75).
// No imports on purpose: worker.ts uses this to answer before the Next server loads,
// and 10 ms of CPU on Workers Free leaves no room for the catalog.

/**
 * old slug -> new slug. Only São Paulo Yellow (a registry paint, not in the catalog)
 * has an accent today; tests/unit/legacy-slugs.test.ts proves no catalog or alias
 * name needs an entry. Add one here if a stored paint name with an accent ever has
 * a public link under its old slug.
 */
export const LEGACY_SLUGS: Readonly<Record<string, string>> = {
  's-o-paulo-yellow': 'sao-paulo-yellow',
};

/** The slug colorToSlug produced before #75: accented letters were dropped. Tests only. */
export function oldColorToSlug(colorName: string): string {
  return colorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** The current slug for an old one, else null. Own keys only: slugs come from URLs. */
export function legacySlugTarget(slug: string): string | null {
  const key = slug.toLowerCase();
  return Object.hasOwn(LEGACY_SLUGS, key) ? LEGACY_SLUGS[key] : null;
}

const COLOR_PATH = /^\/colors\/([^/]+)(\/opengraph-image)?$/;

/**
 * The URL a request for an old color slug (page or OG card) should be redirected
 * to, query string kept, or null when the request is not one.
 */
export function legacySlugRedirect(request: Request): string | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const match = COLOR_PATH.exec(url.pathname);
  if (!match) return null;
  const target = legacySlugTarget(match[1]);
  if (!target) return null;
  return `${url.origin}/colors/${target}${match[2] ?? ''}${url.search}`;
}
