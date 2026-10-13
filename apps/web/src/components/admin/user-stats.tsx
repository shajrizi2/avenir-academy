'use client';

import { ROLES, type Role } from '@ai-academy/shared';
import { useQueries } from '@tanstack/react-query';
import { GraduationCap, Presentation, Shield } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
import { usersQuery } from '@/lib/queries';

const ROLE_META: Record<Role, { label: string; icon: typeof Shield }> = {
  STUDENT: { label: t.admin.overview.roleStudents, icon: GraduationCap },
  INSTRUCTOR: { label: t.admin.overview.roleInstructors, icon: Presentation },
  ADMIN: { label: t.admin.overview.roleAdmins, icon: Shield },
};

/** Account totals per role (pageSize 1: we only need `total`). */
export function UserStats() {
  const results = useQueries({
    queries: ROLES.map((role) => usersQuery({ page: 1, pageSize: 1, role })),
  });

  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {ROLES.map((role, i) => {
        const { label, icon: Icon } = ROLE_META[role];
        const result = results[i];
        return (
          <li key={role}>
            <Link
              href={`/admin/users?role=${role}`}
              className="rounded-card focus-visible:ring-ring/50 block h-full outline-none focus-visible:ring-3"
            >
              <Card variant="pressable" className="h-full">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <Icon className="size-4" aria-hidden /> {label}
                  </CardDescription>
                  <CardTitle className="text-title font-extrabold">
                    {result.data ? result.data.total : <Skeleton className="h-9 w-12" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-ink text-sm font-bold">
                  {t.admin.overview.manage}
                </CardContent>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
