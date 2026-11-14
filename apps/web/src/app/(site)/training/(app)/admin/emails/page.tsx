import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmailLog } from '@/components/admin/emails/email-log';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.emails };

export default function AdminEmailsPage() {
  return (
    <>
      <PageHeader
        title={t.adminLaunch.emails.title}
        description={t.adminLaunch.emails.description}
      />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <EmailLog />
      </Suspense>
    </>
  );
}
