import path from 'node:path';
import type { NextConfig } from 'next';

/** Where the Next.js server reaches the API (server components and the /api/v1 rewrite). */
const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1';

/**
 * Content-Security-Policy for production builds (Next's dev server needs eval). Next inlines
 * its RSC payload as <script>, so script-src keeps 'unsafe-inline'; nonces would make every
 * page dynamic. Google Analytics is the only third party (it loads only after consent).
 * HSTS is set by the reverse proxy (deploy/Caddyfile).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  // Instructor photos and course covers are external https URLs.
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()',
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The Docker image (Dockerfile, target `web`) runs the self-contained server; local
  // `next start` (Playwright, dev previews) keeps the regular build.
  ...(process.env.BUILD_STANDALONE === '1' && {
    output: 'standalone',
    // Trace files from the monorepo root so @ai-academy/shared is included.
    outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  }),
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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
