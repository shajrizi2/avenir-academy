'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Inbox, Landmark, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { adminStatsQuery, enrollmentsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** A call-out on the admin overview: how many enrollment requests are waiting. */
export function PendingEnrollments() {
  const { data } = useQuery(enrollmentsQuery({ status: 'PENDING', page: 1, pageSize: 1 }));
  const o = t.adminLaunch.overview;
  return (
    <CallOut
      href="/admin/enrollments?status=PENDING"
      icon={Inbox}
      count={data?.total}
      none={o.pendingNone}
      one={o.pendingRequestsOne}
      many={o.pendingRequests}
      hint={o.pendingHint}
    />
  );
}

/** A call-out on the admin overview: bank transfers waiting for confirmation. */
export function PendingBankTransfers() {
  const { data } = useQuery(adminStatsQuery);
  const o = t.adminLaunch.overview;
  return (
    <CallOut
      href="/admin/payments?provider=BANK_TRANSFER&status=PENDING"
      icon={Landmark}
      count={data?.pendingBankTransfers}
      none={o.bankNone}
      one={o.bankWaitingOne}
      many={o.bankWaiting}
      hint={o.bankHint}
    />
  );
}

function CallOut({
  href,
  icon: Icon,
  count,
  none,
  one,
  many,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  count: number | undefined;
  none: string;
  one: string;
  many: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'pressable rounded-card focus-visible:ring-ring/50 flex items-center gap-5 p-6 outline-none focus-visible:ring-3',
        count
          ? 'border-ink bg-active-tint [--press:var(--ink)]'
          : 'border-line-strong bg-background [--press:var(--border-strong)]',
      )}
    >
      <span className="bg-background border-ink text-ink flex size-14 shrink-0 items-center justify-center rounded-2xl border-2">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {count === undefined ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <p className="text-ink text-subheading font-extrabold">
            {count === 0 ? none : count === 1 ? one : fmt(many, { count })}
          </p>
        )}
        <p className="text-ink-soft">{hint}</p>
      </div>
      <ArrowRight className="text-ink size-6 shrink-0" aria-hidden />
    </Link>
  );
}
