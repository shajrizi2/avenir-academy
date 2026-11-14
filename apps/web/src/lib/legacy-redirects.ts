/** Where the academy lives since the job board took over the home page. */
export const TRAINING_PATH = '/training';

/** Top-level academy paths that existed before the move to /training (old emails, Stripe, Google). */
export const LEGACY_ACADEMY_SEGMENTS = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'courses',
  'dashboard',
  'profile',
  'admin',
  'learn',
  'teach',
  'tests',
  'checkout',
  'payments',
] as const;

interface Redirect {
  source: string;
  destination: string;
  permanent: true;
}

/**
 * Permanent redirects from every old academy address to its /training equivalent. Query
 * strings are kept by Next.js. These stay forever: emails already sent link to the old paths.
 */
export function legacyRedirects(): Redirect[] {
  const moved = LEGACY_ACADEMY_SEGMENTS.flatMap((segment) => [
    { source: `/${segment}`, destination: `${TRAINING_PATH}/${segment}`, permanent: true as const },
    {
      source: `/${segment}/:path*`,
      destination: `${TRAINING_PATH}/${segment}/:path*`,
      permanent: true as const,
    },
  ]);
  // The old landing page (/sq) and the retired English site (/en).
  const landing = ['sq', 'en'].flatMap((locale) => [
    { source: `/${locale}`, destination: TRAINING_PATH, permanent: true as const },
    { source: `/${locale}/:path*`, destination: TRAINING_PATH, permanent: true as const },
  ]);
  return [...landing, ...moved];
}
