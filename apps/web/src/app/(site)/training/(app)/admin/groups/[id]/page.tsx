import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GroupDetail } from '@/components/admin/groups/group-detail';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.groups };

export default function AdminGroupPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <GroupDetail />
    </Suspense>
  );
}
