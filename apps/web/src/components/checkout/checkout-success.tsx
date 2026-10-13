'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Hourglass } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n/messages';
import { myPaymentQuery } from '@/lib/queries';
import { useNow } from '@/lib/use-now';

const POLL_MS = 2_000;
const SLOW_AFTER_MS = 60_000;

/**
 * Where Stripe sends the student back. The redirect proves nothing: the page polls the
 * payment until the webhook has confirmed it.
 */
export function CheckoutSuccess() {
  const paymentId = useSearchParams().get('payment') ?? '';
  const s = t.checkout.success;
  const payment = useQuery({
    ...myPaymentQuery(paymentId),
    enabled: Boolean(paymentId),
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' || !query.state.data ? POLL_MS : false,
  });
  const startedAt = useFirstRender();
  const now = useNow();
  const slow = now > 0 && now - startedAt > SLOW_AFTER_MS;

  const confirmed = payment.data?.status === 'CONFIRMED';
  const firstMonth = payment.data?.module.order === 1;

  if (confirmed) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={s.confirmedTitle}
        description={firstMonth ? s.confirmedText : s.confirmedModule}
        action={
          <Button asChild variant="chunky">
            <Link href={payment.data ? `/learn/${payment.data.course.slug}` : '/dashboard'}>
              {s.goToCourse}
            </Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Hourglass}
      title={s.title}
      description={slow ? s.slow : s.waiting}
      action={
        slow ? (
          <Button asChild variant="chunky-outline">
            <Link href="/dashboard">{s.goToDashboard}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}

function useFirstRender(): number {
  // A stable timestamp from the first client render (0 on the server).
  const now = useNow();
  const [first] = useStateOnce(now);
  return first;
}

import { useState } from 'react';
function useStateOnce<T>(value: T): [T] {
  const [state, setState] = useState(value);
  if (state === 0 && value !== 0) setState(value);
  return [state];
}
