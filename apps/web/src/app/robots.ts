import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/training/dashboard',
        '/training/profile',
        '/training/admin',
        '/training/reset-password',
        '/api/',
        '/cregjistrohu',
        '/sourcing',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
