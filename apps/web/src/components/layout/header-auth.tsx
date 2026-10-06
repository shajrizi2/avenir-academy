'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { homeFor } from '@/lib/routes';
import { UserMenu } from './user-menu';

/** Right-hand side of the public header: login/register, or dashboard + account menu. */
export function HeaderAuth() {
  const { status, user } = useAuth();

  if (status === 'loading') return <Skeleton className="h-8 w-24" />;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href={homeFor(user.role)}>{user.role === 'ADMIN' ? 'Admin' : 'Dashboard'}</Link>
        </Button>
        <UserMenu />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild>
        <Link href="/register">Get started</Link>
      </Button>
    </div>
  );
}
