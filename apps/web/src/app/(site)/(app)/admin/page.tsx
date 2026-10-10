import type { Metadata } from 'next';
import { PendingEnrollments } from '@/components/admin/pending-enrollments';
import { UserStats } from '@/components/admin/user-stats';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin overview"
        description="What needs your attention, and accounts by role."
      />
      <PendingEnrollments />
      <UserStats />
    </>
  );
}
