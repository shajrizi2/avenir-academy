import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UserManagement } from '@/components/admin/user-management';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Users' };

export default function AdminUsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="Find accounts and change their role. Instructors can manage modules assigned to them."
      />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <UserManagement />
      </Suspense>
    </>
  );
}
