'use client';

import type { Role } from '@ai-academy/shared';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { homeFor } from '@/lib/routes';

/** Renders children only for the given roles (use inside the signed-in area). */
export function RoleGate({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (roles.includes(user.role)) return children;
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this page"
      description="This area is limited to other roles. If you think this is a mistake, contact an administrator."
      action={
        <Button asChild variant="outline">
          <Link href={homeFor(user.role)}>Go to your dashboard</Link>
        </Button>
      }
    />
  );
}
