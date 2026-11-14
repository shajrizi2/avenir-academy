import type { Metadata } from 'next';
import { AdminJobs } from '@/components/admin/jobs/admin-jobs';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.jobs };

export default function AdminJobsPage() {
  return <AdminJobs />;
}
