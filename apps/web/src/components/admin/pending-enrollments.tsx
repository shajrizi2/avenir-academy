'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { enrollmentsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** A call-out on the admin overview: how many enrollment requests are waiting. */
export function PendingEnrollments() {
  const { data } = useQuery(enrollmentsQuery({ status: 'PENDING', page: 1, pageSize: 1 }));
  const count = data?.total;

  return (
    <Link
      href="/admin/enrollments"
      className={cn(
        'pressable rounded-card focus-visible:ring-ring/50 flex items-center gap-5 p-6 outline-none focus-visible:ring-3',
        count
          ? 'border-ink bg-active-tint [--press:var(--ink)]'
          : 'border-line-strong bg-background [--press:var(--border-strong)]',
      )}
    >
      <span className="bg-background border-ink text-ink flex size-14 shrink-0 items-center justify-center rounded-2xl border-2">
        <Inbox className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {count === undefined ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <p className="text-ink text-subheading font-extrabold">
            {count === 0
              ? 'No enrollment requests waiting'
              : `${count} enrollment request${count === 1 ? '' : 's'} waiting`}
          </p>
        )}
        <p className="text-ink-soft">Approve requests to open module 1 for new students.</p>
      </div>
      <ArrowRight className="text-ink size-6 shrink-0" aria-hidden />
    </Link>
  );
}
