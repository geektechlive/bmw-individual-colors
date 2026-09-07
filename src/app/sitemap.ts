import type { MetadataRoute } from 'next';
import { getEntries } from '../lib/queries';
import { colorToSlug, canonicalColorName } from '../lib/colors';

const BASE_URL = 'https://mcolors.geektechlive.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getEntries();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/entries`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/map`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/colors`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/reports`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE_URL}/submit`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // One URL per distinct CANONICAL color slug — alias rows (e.g. ext_color
  // "Enzian Blue") must merge into their canonical color's entry ("Gentian
  // Blue") rather than producing a separate sitemap URL for the same page.
  // lastModified is the newest created_at across the merged group.
  const latestByColor = new Map<string, string>();
  for (const entry of entries) {
    const canonical = canonicalColorName(entry.ext_color);
    const existing = latestByColor.get(canonical);
    if (!existing || entry.created_at > existing) {
      latestByColor.set(canonical, entry.created_at);
    }
  }

  const colorRoutes: MetadataRoute.Sitemap = Array.from(latestByColor.entries()).map(
    ([colorName, createdAt]) => ({
      url: `${BASE_URL}/colors/${colorToSlug(colorName)}`,
      lastModified: new Date(createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })
  );

  return [...staticRoutes, ...colorRoutes];
}
