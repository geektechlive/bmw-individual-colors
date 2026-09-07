import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/edit/'],
    },
    sitemap: 'https://mcolors.geektechlive.com/sitemap.xml',
  };
}
