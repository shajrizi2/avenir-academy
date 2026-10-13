'use client';

import { EMAIL_TYPES, type EmailStatus } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { Pager } from '@/components/pager';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { adminEmailsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 30;
const STATUS_CLASS: Record<EmailStatus, string> = {
  PENDING: 'bg-active-tint text-active-ink',
  SENT: 'bg-passed-tint text-passed-ink',
  FAILED: 'bg-failed-tint text-failed-ink',
};

export function EmailLog() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const e = t.adminLaunch.emails;
  const type = EMAIL_TYPES.find((x) => x === params.get('type'));
  const page = Math.max(1, Number(params.get('page')) || 1);

  function update(next: { type?: string; page?: number }) {
    const sp = new URLSearchParams(params);
    if (next.type !== undefined) {
      if (next.type) sp.set('type', next.type);
      else sp.delete('type');
      sp.delete('page');
    }
    if (next.page && next.page > 1) sp.set('page', String(next.page));
    else if (next.page) sp.delete('page');
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const { data, isPending, isFetching, error } = useQuery(
    adminEmailsQuery({ type, page, pageSize: PAGE_SIZE }),
  );

  return (
    <div className="space-y-6">
      <label className="grid max-w-sm gap-1 text-sm">
        <span className="text-ink font-semibold">{e.filterType}</span>
        <select
          value={type ?? ''}
          onChange={(ev) => update({ type: ev.target.value })}
          className="border-input bg-background text-ink focus-visible:border-ink focus-visible:ring-ring/40 h-11 rounded-lg border px-3 outline-none focus-visible:ring-3"
        >
          <option value="">{e.allTypes}</option>
          {EMAIL_TYPES.map((x) => (
            <option key={x} value={x}>
              {t.status.emailType[x]}
            </option>
          ))}
        </select>
      </label>
      {isPending ? (
        <Skeleton className="rounded-card h-64 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Mail} title={e.emptyTitle} description={e.emptyText} />
      ) : (
        <ul className={cn('space-y-3', isFetching && 'opacity-60 transition-opacity')}>
          {data.items.map((row) => (
            <li
              key={row.id}
              className="border-line rounded-card bg-background flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-ink font-bold">{row.subject}</p>
                <p className="text-ink-soft text-sm">
                  {row.to}
                  {row.user && ` (${row.user.firstName} ${row.user.lastName})`} ·{' '}
                  {t.status.emailType[row.type]} ·{' '}
                  {formatDate(row.sentAt ?? row.createdAt, 'dateTime')}
                </p>
                {row.error && <p className="text-failed-ink text-sm">{row.error}</p>}
              </div>
              <span
                className={cn(
                  'inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-bold',
                  STATUS_CLASS[row.status],
                )}
              >
                {t.status.email[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <Pager
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          noun="email-e"
          onPage={(n) => update({ page: n })}
        />
      )}
    </div>
  );
}
