'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from './app-shell';

/**
 * Client-side gate for the signed-in area: waits for the session restore, sends anonymous
 * visitors to login, then renders the sidebar shell. The API enforces auth on every request;
 * this is for UX.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-4 p-8" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="rounded-card h-40 w-full" />
      </div>
    );
  }

  return <AppShell role={user.role}>{children}</AppShell>;
}
