import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GroupList } from '@/components/admin/groups/group-list';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.groups };

export default function AdminGroupsPage() {
  return (
    <>
      <PageHeader
        title={t.adminLaunch.groups.title}
        description={t.adminLaunch.groups.description}
      />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <GroupList />
      </Suspense>
    </>
  );
}
