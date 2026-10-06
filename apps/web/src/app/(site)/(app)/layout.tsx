import { Suspense } from 'react';
import { RequireAuth } from '@/components/layout/require-auth';

// The signed-in area renders only after the client restores the session from the refresh
// cookie, so navigations into it are not expected to be instant (dev-time validation only).
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <RequireAuth>{children}</RequireAuth>
    </Suspense>
  );
}
