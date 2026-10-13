import { DEFAULT_LOCALE } from '@ai-academy/shared';
import { type NextRequest, NextResponse } from 'next/server';

/** Must match REFRESH_COOKIE in apps/api/src/modules/auth/auth.constants.ts. */
const SESSION_COOKIE = 'aa_refresh';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // "/" → the Albanian landing page (the only active language).
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
  }

  // The English site was retired: /en and /en/... move permanently to the Albanian page.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const target = new URL(`/${DEFAULT_LOCALE}${pathname.slice(3)}${search}`, request.url);
    return NextResponse.redirect(target, 301);
  }

  // Optimistic redirect for signed-out visitors. UX only; the API enforces auth.
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/',
    '/en',
    '/en/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/learn/:path*',
    '/teach/:path*',
    '/tests/:path*',
    '/checkout/:path*',
    '/payments/:path*',
  ],
};
