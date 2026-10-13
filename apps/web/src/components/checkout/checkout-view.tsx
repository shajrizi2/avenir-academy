'use client';

import {
  type CheckoutResult,
  discountPercent,
  formatPrice,
  formatSqDate,
  formatSqSchedule,
  type PaymentMethod,
} from '@ai-academy/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { track } from '@/lib/analytics';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  groupQuery,
  learnCourseQuery,
  myEnrollmentsQuery,
  paymentMethodsQuery,
} from '@/lib/queries';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

/**
 * Checkout: the first month of a group (holds a seat) or, with `?module=`, a later month of
 * the student's enrollment. Card → Stripe Checkout; bank transfer → the payment page.
 */
export function CheckoutView() {
  const { groupId } = useParams<{ groupId: string }>();
  const params = useSearchParams();
  const moduleId = params.get('module');
  const cancelled = params.get('cancelled') === '1';
  const router = useRouter();
  const { user } = useAuth();
  const c = t.checkout;

  const group = useQuery(groupQuery(groupId));
  const methods = useQuery(paymentMethodsQuery);
  const enrollments = useQuery(myEnrollmentsQuery);
  const existing = enrollments.data?.find((e) => e.course.id === group.data?.course.id);
  const learn = useQuery({
    ...learnCourseQuery(group.data?.course.slug ?? ''),
    enabled: Boolean(moduleId && group.data && existing?.status === 'APPROVED'),
  });
  const month = moduleId ? learn.data?.modules.find((m) => m.id === moduleId) : null;

  const [provider, setProvider] = useState<PaymentMethod | null>(null);
  const [waitlisted, setWaitlisted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: (method: PaymentMethod) =>
      moduleId && existing
        ? apiFetch<CheckoutResult>(`/enrollments/${existing.id}/payments`, {
            method: 'POST',
            body: { moduleId, provider: method },
          })
        : apiFetch<CheckoutResult>('/checkout', {
            method: 'POST',
            body: { groupId, provider: method },
          }),
    onSuccess: (result) => {
      track('checkout_started', { provider: result.kind, group: groupId });
      if (result.kind === 'STRIPE') {
        window.location.assign(result.url);
      } else if (result.kind === 'BANK_TRANSFER') {
        router.push(`/payments/${result.paymentId}`);
      } else {
        setWaitlisted(result.group.name);
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (user && user.role !== 'STUDENT') {
    return <EmptyState icon={Users} title={t.catalog.detail.staffOnly} description="" />;
  }
  if (group.isPending || methods.isPending || enrollments.isPending) {
    return <Skeleton className="rounded-card h-96 w-full" />;
  }
  if (group.error) return <FormError message={errorMessage(group.error)} />;
  if (waitlisted) {
    return (
      <EmptyState
        icon={Users}
        title={t.status.enrollment.WAITLISTED}
        description={fmt(c.waitlisted, { group: waitlisted })}
        action={
          <Button asChild variant="chunky">
            <Link href="/dashboard">{t.checkout.success.goToDashboard}</Link>
          </Button>
        }
      />
    );
  }

  const g = group.data;
  const price = moduleId && learn.data ? learn.data.priceCents : null;
  const amount = formatPrice(price ?? 0, learn.data?.currency ?? 'EUR');
  const first = !moduleId;
  const full = g.seatsLeft === 0 && existing?.status !== 'PENDING_PAYMENT';
  const available = methods.data ?? [];
  const chosen = provider ?? available[0] ?? null;

  // States that don't need a payment right now.
  if (first && existing?.status === 'APPROVED') {
    return (
      <Notice text={c.alreadyEnrolled} href={`/learn/${g.course.slug}`} label={c.backToCourse} />
    );
  }
  if (moduleId && month?.paid) {
    return <Notice text={c.alreadyPaid} href={`/learn/${g.course.slug}`} label={c.backToCourse} />;
  }

  return (
    <>
      <Link
        href={`/courses/${g.course.slug}`}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {c.backToCourse}
      </Link>
      <PageHeader
        title={first ? c.title : fmt(c.titleModule, { number: month?.order ?? '' })}
        description={first ? c.description : c.descriptionModule}
      />
      {cancelled && <FormError message={c.cancelled} />}
      {moduleId && month?.paymentPending && <FormError message={c.pendingBank} />}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle as="h2">{c.method}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormError message={error} />
            {full ? (
              <p className="text-ink font-semibold">{c.full}</p>
            ) : available.length === 0 ? (
              <p className="text-ink-soft">{c.noMethods}</p>
            ) : (
              <div role="radiogroup" aria-label={c.method} className="grid gap-3">
                {available.includes('STRIPE') && (
                  <MethodCard
                    icon={CreditCard}
                    title={c.card}
                    hint={`${c.cardHint} ${first ? c.holdCard : ''}`}
                    checked={chosen === 'STRIPE'}
                    onSelect={() => setProvider('STRIPE')}
                  />
                )}
                {available.includes('BANK_TRANSFER') && (
                  <MethodCard
                    icon={Building2}
                    title={c.bank}
                    hint={c.bankHint}
                    checked={chosen === 'BANK_TRANSFER'}
                    onSelect={() => setProvider('BANK_TRANSFER')}
                  />
                )}
              </div>
            )}
            {available.length > 0 && (
              <Button
                variant="chunky"
                size="lg"
                className="w-full sm:w-auto"
                disabled={start.isPending || !chosen}
                onClick={() => chosen && start.mutate(chosen)}
              >
                {start.isPending
                  ? chosen === 'STRIPE'
                    ? c.redirecting
                    : t.common.working
                  : full
                    ? c.joinWaitlist
                    : chosen === 'STRIPE'
                      ? c.pay
                      : c.payBank}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">{c.summary}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <Row label={c.course} value={g.course.title} />
              <Row label={c.group} value={g.name} />
              <Row
                label={c.starts}
                value={formatSqDate(`${g.startDate}T12:00:00Z`, { weekday: true })}
              />
              <Row label={c.schedule} value={formatSqSchedule(g)} />
              {month && <Row label={c.month} value={`Moduli ${month.order}: ${month.title}`} />}
              {!first || learn.data ? (
                <Row label={c.amount} value={amount} />
              ) : (
                <Row label={c.amount} value={<CoursePrice courseSlug={g.course.slug} />} />
              )}
              {first && (
                <Row
                  label={t.common.seats}
                  value={
                    g.seatsLeft === 0
                      ? t.catalog.detail.full
                      : fmt(c.seatsLeft, { count: g.seatsLeft })
                  }
                />
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MethodCard({
  icon: Icon,
  title,
  hint,
  checked,
  onSelect,
}: {
  icon: typeof CreditCard;
  title: string;
  hint: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'rounded-card focus-visible:ring-ring/50 flex w-full items-start gap-4 border-2 p-4 text-left outline-none focus-visible:ring-3',
        checked
          ? 'border-ink bg-track-ai-tint'
          : 'border-line-strong bg-background hover:border-ink',
      )}
    >
      <span className="bg-background border-ink text-ink flex size-11 shrink-0 items-center justify-center rounded-xl border-2">
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className="text-ink block font-bold">{title}</span>
        <span className="text-ink-soft block text-sm">{hint}</span>
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink text-right font-semibold">{value}</dd>
    </div>
  );
}

function Notice({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <EmptyState
      icon={CreditCard}
      title={text}
      description=""
      action={
        <Button asChild variant="chunky">
          <Link href={href}>{label}</Link>
        </Button>
      }
    />
  );
}

/** The course's price for a first month (the public course has it; the student isn't enrolled yet). */
function CoursePrice({ courseSlug }: { courseSlug: string }) {
  const course = useQuery({
    queryKey: ['courses', courseSlug],
    queryFn: () =>
      apiFetch<{ priceCents: number; listPriceCents: number | null; currency: string }>(
        `/courses/${encodeURIComponent(courseSlug)}`,
      ),
  });
  if (!course.data) return <Skeleton className="h-5 w-20" />;
  const { priceCents, listPriceCents, currency } = course.data;
  return (
    <>
      {fmt(t.checkout.perMonth, { price: formatPrice(priceCents, currency) })}
      {listPriceCents && discountPercent(priceCents, listPriceCents) > 0 && (
        <span className="text-ink-soft ml-2 font-normal">
          <s>{formatPrice(listPriceCents, currency)}</s>
        </span>
      )}
    </>
  );
}
