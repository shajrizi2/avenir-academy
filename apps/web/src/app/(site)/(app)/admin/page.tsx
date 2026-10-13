import type { Metadata } from 'next';
import { PendingBankTransfers, PendingEnrollments } from '@/components/admin/pending-enrollments';
import { PlatformStats } from '@/components/admin/platform-stats';
import { UserStats } from '@/components/admin/user-stats';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.admin };

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title={t.adminLaunch.overview.title}
        description={t.adminLaunch.overview.description}
      />
      <PendingBankTransfers />
      <PendingEnrollments />
      <PlatformStats />
      <UserStats />
    </>
  );
}
