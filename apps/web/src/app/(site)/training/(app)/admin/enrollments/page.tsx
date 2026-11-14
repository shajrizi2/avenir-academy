import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnrollmentQueue } from '@/components/admin/enrollments/enrollment-queue';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.enrollments };

export default function AdminEnrollmentsPage() {
  return (
    <>
      <PageHeader
        title={t.adminLaunch.enrollments.title}
        description={t.adminLaunch.enrollments.description}
      />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <EnrollmentQueue />
      </Suspense>
    </>
  );
}
