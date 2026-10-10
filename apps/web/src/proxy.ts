import { DEFAULT_LOCALE, isLocale } from '@ai-academy/shared';
import { type NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE } from '@/i18n/cookie';

/** Must match REFRESH_COOKIE in apps/api/src/modules/auth/auth.constants.ts. */
const SESSION_COOKIE = 'aa_refresh';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // "/" → the landing page in the visitor's chosen language (Albanian by default).
  if (pathname === '/') {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
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
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/learn/:path*',
    '/teach/:path*',
    '/tests/:path*',
  ],
};
