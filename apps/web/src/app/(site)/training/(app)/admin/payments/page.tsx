import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentList } from '@/components/admin/payments/payment-list';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.payments };

export default function AdminPaymentsPage() {
  return (
    <>
      <PageHeader
        title={t.adminLaunch.payments.title}
        description={t.adminLaunch.payments.description}
      />
      <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
        <PaymentList />
      </Suspense>
    </>
  );
}
