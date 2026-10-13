'use client';

import type { Role } from '@ai-academy/shared';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n/messages';
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
      title={t.errors.noAccessTitle}
      description={t.errors.noAccessText}
      action={
        <Button asChild variant="outline">
          <Link href={homeFor(user.role)}>{t.errors.goToDashboard}</Link>
        </Button>
      }
    />
  );
}
