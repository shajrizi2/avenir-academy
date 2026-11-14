import { type NextRequest, NextResponse } from 'next/server';

/** Must match REFRESH_COOKIE in apps/api/src/modules/auth/auth.constants.ts. */
const SESSION_COOKIE = 'aa_refresh';

/**
 * Optimistic redirect for signed-out visitors of the academy's signed-in area. UX only; the
 * API enforces auth. Old addresses (/sq, /login, /dashboard, ...) are moved permanently to
 * /training by the redirects in next.config.ts, which run before this.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/training/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/training/dashboard/:path*',
    '/training/profile/:path*',
    '/training/admin/:path*',
    '/training/learn/:path*',
    '/training/teach/:path*',
    '/training/tests/:path*',
    '/training/checkout/:path*',
    '/training/payments/:path*',
  ],
};
