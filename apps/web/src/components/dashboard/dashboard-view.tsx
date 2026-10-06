'use client';

import { Shield } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { InstructorDashboard } from './instructor-dashboard';
import { StudentDashboard } from './student-dashboard';

const SUBTITLE = {
  STUDENT: 'Your courses, live sessions and progress in one place.',
  INSTRUCTOR: 'Everything you need to run your modules.',
  ADMIN: 'Platform administration lives in the admin area.',
} as const;

export function DashboardView() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <PageHeader title={`Welcome, ${user.firstName}`} description={SUBTITLE[user.role]} />
      {user.role === 'STUDENT' && <StudentDashboard />}
      {user.role === 'INSTRUCTOR' && <InstructorDashboard />}
      {user.role === 'ADMIN' && (
        <EmptyState
          icon={Shield}
          title="You're an administrator"
          description="Manage users and platform settings from the admin area."
          action={
            <Button asChild>
              <Link href="/admin">Open admin</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
