'use client';

import { Shield } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';
import { useAuth } from '@/lib/auth-context';
import { InstructorDashboard } from './instructor-dashboard';
import { StudentDashboard } from './student-dashboard';

export function DashboardView() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <PageHeader
        title={fmt(t.dashboard.welcome, { name: user.firstName })}
        description={t.dashboard.subtitle[user.role]}
      />
      {user.role === 'STUDENT' && <StudentDashboard />}
      {user.role === 'INSTRUCTOR' && <InstructorDashboard />}
      {user.role === 'ADMIN' && (
        <EmptyState
          icon={Shield}
          title={t.dashboard.adminTitle}
          description={t.dashboard.adminText}
          action={
            <Button asChild>
              <Link href="/admin">{t.dashboard.openAdmin}</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
