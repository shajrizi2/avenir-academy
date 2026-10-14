'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
import { useAuth } from '@/lib/auth-context';
import { homeFor } from '@/lib/routes';
import { UserMenu } from './user-menu';

/** Right-hand side of the public header: login/register, or dashboard + account menu. */
export function HeaderAuth() {
  const { status, user } = useAuth();

  if (status === 'loading') return <Skeleton className="rounded-button h-10 w-32" />;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href={homeFor(user.role)}>
            {user.role === 'ADMIN' ? t.nav.admin : t.nav.dashboard}
          </Link>
        </Button>
        <UserMenu />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="text-ink rounded-lg px-3 py-2 text-sm font-semibold underline-offset-4 hover:underline"
      >
        {t.nav.login}
      </Link>
      <Button asChild variant="chunky">
        <Link href="/register">{t.nav.startNow}</Link>
      </Button>
    </div>
  );
}
