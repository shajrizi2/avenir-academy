import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutSuccess } from '@/components/checkout/checkout-success';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.checkoutSuccess };

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-64 w-full" />}>
      <CheckoutSuccess />
    </Suspense>
  );
}
