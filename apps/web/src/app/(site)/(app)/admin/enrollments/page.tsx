import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnrollmentQueue } from '@/components/admin/enrollments/enrollment-queue';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Enrollments' };

export default function AdminEnrollmentsPage() {
  return (
    <>
      <PageHeader
        title="Enrollments"
        description="Approve requests once a seat is confirmed. Approving opens module 1 for the student; the other modules unlock as they pass each test."
      />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <EnrollmentQueue />
      </Suspense>
    </>
  );
}
