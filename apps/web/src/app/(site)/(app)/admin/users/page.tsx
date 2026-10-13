import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UserManagement } from '@/components/admin/user-management';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.users };

export default function AdminUsersPage() {
  return (
    <>
      <PageHeader title={t.admin.users.title} description={t.admin.users.description} />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <UserManagement />
      </Suspense>
    </>
  );
}
