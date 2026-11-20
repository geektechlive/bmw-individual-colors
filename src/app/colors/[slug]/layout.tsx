import { notFound, permanentRedirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { aliasRedirectSlug, catalogNameForSlug } from '../../../lib/colors';
import { legacySlugTarget } from '../../../lib/legacy-slugs';
import { resolveColorSlug } from '../../../lib/queries';

/**
 * Decides whether the paint exists BEFORE loading.tsx streams its skeleton (#94).
 * The skeleton commits a 200 status, so a notFound() or redirect in page.tsx came too
 * late: unknown paints showed the 404 page with a 200, and old names redirected on
 * the client. A layout renders above the loading boundary, so here they get a real
 * 404 or 308. Catalog paints skip the database, so their skeleton is unchanged; only
 * slugs outside the catalog (paints owners typed, or nonsense) wait for the lookup.
 */
export default async function PaintLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const aliasTarget = aliasRedirectSlug(slug);
  if (aliasTarget) permanentRedirect(`/colors/${aliasTarget}`);
  const legacyTarget = legacySlugTarget(slug);
  if (legacyTarget) permanentRedirect(`/colors/${legacyTarget}`);
  if (!catalogNameForSlug(slug.toLowerCase()) && !(await resolveColorSlug(slug))) notFound();
  return children;
}
