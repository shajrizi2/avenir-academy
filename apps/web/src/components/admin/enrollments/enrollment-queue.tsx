'use client';

import type { EnrollmentStatus } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EnrollmentStatusBadge } from '@/components/course/enrollment-status-badge';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { Pager } from '@/components/pager';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { enrollmentsQuery } from '@/lib/queries';
import { DecisionButtons } from './decision-buttons';

const PAGE_SIZE = 20;
type Filter = EnrollmentStatus | 'ALL';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Declined' },
  { value: 'ALL', label: 'All' },
];

/** The approval queue. Filter and page live in the URL. */
export function EnrollmentQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const statusParam = params.get('status') as Filter | null;
  const filter: Filter = FILTERS.some((f) => f.value === statusParam) ? statusParam! : 'PENDING';
  const page = Math.max(1, Number(params.get('page')) || 1);

  function update(next: { status?: Filter; page?: number }) {
    const sp = new URLSearchParams(params);
    if (next.status) sp.set('status', next.status);
    if (next.page && next.page > 1) sp.set('page', String(next.page));
    else sp.delete('page');
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const { data, isPending, isFetching, error } = useQuery(
    enrollmentsQuery({
      status: filter === 'ALL' ? undefined : filter,
      page,
      pageSize: PAGE_SIZE,
    }),
  );

  return (
    <div className="space-y-6">
      <FilterPills
        label="Filter by status"
        options={FILTERS}
        value={filter}
        onChange={(status) => update({ status })}
      />

      {isPending ? (
        <Skeleton className="rounded-card h-64 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'PENDING' ? 'No requests waiting' : 'Nothing here'}
          description={
            filter === 'PENDING'
              ? 'New enrollment requests from students appear here.'
              : 'No enrollments match this filter.'
          }
        />
      ) : (
        <ul className={isFetching ? 'space-y-3 opacity-60 transition-opacity' : 'space-y-3'}>
          {data.items.map((enrollment) => (
            <li
              key={enrollment.id}
              className="border-line rounded-card bg-background flex flex-col gap-4 border p-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-ink font-bold">
                  {enrollment.user.firstName} {enrollment.user.lastName}
                  <span className="text-ink-soft font-normal"> · {enrollment.user.email}</span>
                </p>
                <p className="text-ink">{enrollment.course.title}</p>
                <p className="text-ink-soft text-sm">
                  Requested <LocalDateTime value={enrollment.createdAt} />
                  {enrollment.decidedAt && (
                    <>
                      {' '}
                      · decided <LocalDateTime value={enrollment.decidedAt} />
                    </>
                  )}
                </p>
                {enrollment.note && (
                  <p className="text-ink-soft text-sm italic">Note: {enrollment.note}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <EnrollmentStatusBadge status={enrollment.status} />
                {(enrollment.status === 'PENDING' || enrollment.status === 'REJECTED') && (
                  <DecisionButtons enrollment={enrollment} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <Pager
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          noun="request"
          onPage={(p) => update({ page: p })}
        />
      )}
    </div>
  );
}
