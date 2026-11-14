import { type NextRequest, NextResponse } from 'next/server';

/** Must match REFRESH_COOKIE in apps/api/src/modules/auth/auth.constants.ts. */
const SESSION_COOKIE = 'aa_refresh';
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1';
/** How long "/" trusts the last answer to "is the board public?". */
const STATUS_TTL_MS = 60_000;

let status: { public: boolean; at: number } | null = null;

/** SiteSettings.jobBoardPublic, asked of the API at most once a minute; unknown counts as off. */
async function boardIsPublic(now: number): Promise<boolean> {
  if (status && now - status.at < STATUS_TTL_MS) return status.public;
  try {
    const res = await fetch(`${API_INTERNAL_URL}/jobs/status`, {
      signal: AbortSignal.timeout(1500),
    });
    const body = (await res.json()) as { public?: unknown };
    status = { public: res.ok && body.public === true, at: now };
  } catch {
    status = { public: false, at: now };
  }
  return status.public;
}

/** Test hook: forget the cached board status. */
export function resetBoardStatus(): void {
  status = null;
}

/**
 * "/" is the job board once an admin switches it on (PLAN D36); until then it shows the
 * academy, and `/?preview` lets the team look at the board first. The academy's signed-in
 * area gets an optimistic redirect to its login (UX only; the API enforces auth). Old
 * addresses (/sq, /login, /dashboard, ...) move to /training through next.config.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  if (pathname === '/') {
    if (searchParams.has('preview') || (await boardIsPublic(Date.now())))
      return NextResponse.next();
    return NextResponse.redirect(new URL('/training', request.url));
  }
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/training/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/',
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
