import { type NextRequest, NextResponse } from 'next/server';

/** Must match REFRESH_COOKIE in apps/api/src/modules/auth/auth.constants.ts. */
const SESSION_COOKIE = 'aa_refresh';

/**
 * Optimistic redirect for signed-out visitors. This only improves UX; the API
 * enforces authentication and roles on every request.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/admin/:path*'],
};
