import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentView } from '@/components/checkout/payment-view';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.payment };

export default function PaymentPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <PaymentView />
    </Suspense>
  );
}
