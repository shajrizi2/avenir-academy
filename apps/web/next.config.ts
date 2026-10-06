import type { NextConfig } from 'next';

/** Where the Next.js server reaches the API (server components and the /api/v1 rewrite). */
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ['@ai-academy/shared'],
  // Two root layouts ((site) and [locale]) mean no single layout can own the 404 page.
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // The browser talks to the API through this same-origin proxy (docs/PLAN.md D3),
  // so the refresh cookie is first-party and no CORS preflights are needed.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
