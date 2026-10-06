import type { Metadata } from 'next';
import { UserStats } from '@/components/admin/user-stats';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Admin overview" description="Accounts on the platform by role." />
      <UserStats />
    </>
  );
}
