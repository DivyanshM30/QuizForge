import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/register`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE_URL}/upload`, changeFrequency: 'monthly', priority: 0.9 },
  ];
}
