// Old color slugs, answered with a 308 in worker.ts before the Next server loads:
//  - slugs that changed when colorToSlug started transliterating accents (#75), and
//  - the slugs of old paint names that BMW's naming replaced (#89, #93), from the generated
//    paint-redirects.ts.
// No catalog imports on purpose: 10 ms of CPU on Workers Free leaves no room for it.
import { PAINT_SLUG_REDIRECTS } from './paint-redirects';

/**
 * old slug -> new slug for accents. Only São Paulo Yellow has one today (it is in the
 * catalog since #93); tests/unit/legacy-slugs.test.ts proves no other catalog or alias
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
  if (Object.hasOwn(LEGACY_SLUGS, key)) return LEGACY_SLUGS[key];
  return Object.hasOwn(PAINT_SLUG_REDIRECTS, key) ? PAINT_SLUG_REDIRECTS[key] : null;
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
