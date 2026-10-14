'use client';

import { formatPrice, type PaymentSummary } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { myPaymentQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<PaymentSummary['status'], string> = {
  PENDING: 'bg-active-tint text-active-ink',
  CONFIRMED: 'bg-passed-tint text-passed-ink',
  FAILED: 'bg-failed-tint text-failed-ink',
  REFUNDED: 'bg-locked-tint text-locked-ink',
  EXPIRED: 'bg-locked-tint text-locked-ink',
};

/** One payment: bank-transfer instructions while pending, the receipt once confirmed. */
export function PaymentView() {
  const { id } = useParams<{ id: string }>();
  const {
    data: payment,
    isPending,
    error,
  } = useQuery({
    ...myPaymentQuery(id),
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? 15_000 : false),
  });
  const p = t.payments;

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;

  const amount = formatPrice(payment.amountCents, payment.currency);
  const retryHref = payment.group
    ? `/checkout/${payment.group.id}?module=${payment.module.id}`
    : `/courses/${payment.course.slug}`;

  return (
    <>
      <Link
        href="/dashboard"
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {p.backToDashboard}
      </Link>
      <PageHeader
        title={`${payment.course.title}`}
        description={fmt(p.monthOf, { number: payment.module.order, title: payment.module.title })}
        actions={
          <span
            className={cn(
              'inline-flex h-8 items-center rounded-full px-3 text-sm font-bold',
              STATUS_CLASS[payment.status],
            )}
          >
            {t.status.payment[payment.status]}
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        {payment.bank ? (
          <Card>
            <CardHeader>
              <CardTitle as="h2">{p.bankTitle}</CardTitle>
              <CardDescription>{p.bankText}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <BankRow label={p.amount} value={amount} />
                <BankRow label={p.reference} value={payment.bank.reference} highlight />
                <BankRow label={p.beneficiary} value={payment.bank.beneficiary ?? p.bankMissing} />
                <BankRow
                  label={p.iban}
                  value={payment.bank.iban ?? p.bankMissing}
                  copyable={Boolean(payment.bank.iban)}
                />
                <BankRow label={p.bankName} value={payment.bank.bankName ?? p.bankMissing} />
                {payment.bank.swift && <BankRow label={p.swift} value={payment.bank.swift} />}
              </dl>
              {payment.bank.payBy && (
                <p className="text-ink text-sm font-semibold">
                  {fmt(p.holdNote, { date: formatDate(payment.bank.payBy, 'longTime') })}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3">
              {payment.status === 'CONFIRMED' && payment.confirmedAt && (
                <p className="text-passed-ink font-semibold">
                  {fmt(p.confirmedNote, { date: formatDate(payment.confirmedAt, 'longTime') })}
                </p>
              )}
              {payment.status === 'EXPIRED' && <p className="text-ink">{p.expiredNote}</p>}
              {payment.status === 'FAILED' && <p className="text-ink">{p.failedNote}</p>}
              {payment.status === 'REFUNDED' && (
                <p className="text-ink">
                  {fmt(p.refundedNote, { date: formatDate(payment.createdAt, 'date') })}
                </p>
              )}
              {payment.status === 'PENDING' && (
                <p className="text-ink">{t.checkout.success.waiting}</p>
              )}
              {payment.receiptUrl && (
                <Button asChild variant="outline">
                  <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                    {p.receiptStripe} <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              )}
              {(payment.status === 'EXPIRED' || payment.status === 'FAILED') && (
                <Button asChild variant="chunky">
                  <Link href={retryHref}>{p.payAgain}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <Row label={p.method} value={t.status.provider[payment.provider]} />
              <Row label={p.amount} value={amount} />
              <Row label={p.reference} value={payment.reference} />
              <Row label={p.date} value={formatDate(payment.createdAt, 'dateTime')} />
              {payment.group && <Row label={t.checkout.group} value={payment.group.name} />}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function BankRow({
  label,
  value,
  highlight = false,
  copyable = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  copyable?: boolean;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.common.copied);
    } catch {
      // Clipboard access can be refused; the value is still visible to copy by hand.
    }
  }
  return (
    <div className="border-line flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
      <dt className="text-ink-soft text-sm">{label}</dt>
      <dd className="flex items-center gap-2">
        <span
          className={cn(
            'text-ink font-semibold',
            highlight && 'bg-active-tint rounded-lg px-2 py-0.5 font-mono',
          )}
        >
          {value}
        </span>
        {(copyable || highlight) && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${t.common.copy}: ${label}`}
            onClick={() => void copy()}
          >
            <Copy />
          </Button>
        )}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink text-right font-semibold">{value}</dd>
    </div>
  );
}
