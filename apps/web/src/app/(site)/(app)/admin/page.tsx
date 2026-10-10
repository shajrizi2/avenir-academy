import type { Metadata } from 'next';
import { PendingEnrollments } from '@/components/admin/pending-enrollments';
import { PlatformStats } from '@/components/admin/platform-stats';
import { UserStats } from '@/components/admin/user-stats';
import { PageHeader } from '@/components/page-header';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin overview"
        description="What needs your attention, how the platform is doing, and accounts by role."
      />
      <PendingEnrollments />
      <PlatformStats />
      <UserStats />
    </>
  );
}
