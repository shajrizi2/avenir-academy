'use client';

import {
  type AdminPayment,
  formatPrice,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Download, ExternalLink, Undo2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { Pager } from '@/components/pager';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { fmt, t } from '@/i18n/messages';
import { apiDownload, apiFetch, errorMessage } from '@/lib/api';
import { adminGroupsQuery, adminPaymentsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { ManualPaymentDialog } from './manual-payment-dialog';

const PAGE_SIZE = 20;

const STATUS_CLASS: Record<PaymentStatus, string> = {
  PENDING: 'bg-active-tint text-active-ink',
  CONFIRMED: 'bg-passed-tint text-passed-ink',
  FAILED: 'bg-failed-tint text-failed-ink',
  REFUNDED: 'bg-locked-tint text-locked-ink',
  EXPIRED: 'bg-locked-tint text-locked-ink',
};

/** Every payment, with filters in the URL and the admin actions per row. */
export function PaymentList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const p = t.adminLaunch.payments;
  const provider = PAYMENT_METHODS.find((m) => m === params.get('provider'));
  const status = PAYMENT_STATUSES.find((s) => s === params.get('status'));
  const groupId = params.get('group') ?? undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    if (!('page' in next)) sp.delete('page');
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const query = { provider, status, groupId, page, pageSize: PAGE_SIZE };
  const { data, isPending, isFetching, error } = useQuery(adminPaymentsQuery(query));
  const groups = useQuery(adminGroupsQuery());

  async function exportCsv() {
    const qs = new URLSearchParams();
    if (provider) qs.set('provider', provider);
    if (status) qs.set('status', status);
    if (groupId) qs.set('groupId', groupId);
    await apiDownload(`/payments/export.csv?${qs.toString()}`, 'pagesat.csv');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Filter
          label={p.filterProvider}
          value={provider ?? ''}
          onChange={(v) => update({ provider: v })}
          options={[
            { value: '', label: p.allProviders },
            ...PAYMENT_METHODS.map((m) => ({ value: m, label: t.status.provider[m] })),
          ]}
        />
        <Filter
          label={p.filterStatus}
          value={status ?? ''}
          onChange={(v) => update({ status: v })}
          options={[
            { value: '', label: p.allStatuses },
            ...PAYMENT_STATUSES.map((s) => ({ value: s, label: t.status.payment[s] })),
          ]}
        />
        <Filter
          label={p.filterGroup}
          value={groupId ?? ''}
          onChange={(v) => update({ group: v })}
          options={[
            { value: '', label: p.allGroups },
            ...(groups.data ?? []).map((g) => ({
              value: g.id,
              label: `${g.course.title} · ${g.name}`,
            })),
          ]}
        />
        <div className="ml-auto flex gap-2">
          <ManualPaymentDialog />
          <Button variant="outline" onClick={() => void exportCsv()}>
            <Download data-icon="inline-start" /> {p.export}
          </Button>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="rounded-card h-64 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={CreditCard} title={p.emptyTitle} description={p.emptyText} />
      ) : (
        <ul className={cn('space-y-3', isFetching && 'opacity-60 transition-opacity')}>
          {data.items.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </ul>
      )}
      {data && (
        <Pager
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          noun="pagesa"
          onPage={(n) => update({ page: n > 1 ? String(n) : undefined })}
        />
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-ink font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background text-ink focus-visible:border-ink focus-visible:ring-ring/40 h-11 rounded-lg border px-3 outline-none focus-visible:ring-3"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PaymentRow({ payment }: { payment: AdminPayment }) {
  const queryClient = useQueryClient();
  const p = t.adminLaunch.payments;
  const [note, setNote] = useState('');
  const act = useMutation({
    mutationFn: (action: 'confirm' | 'reject' | 'refund') =>
      apiFetch<AdminPayment>(`/payments/${payment.id}/${action}`, {
        method: 'POST',
        body: { note: note || undefined },
      }),
    onSuccess: (_data, action) => {
      toast.success(
        action === 'confirm' ? p.confirmed : action === 'reject' ? p.rejected : p.refunded,
      );
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const name = `${payment.user.firstName} ${payment.user.lastName}`;

  return (
    <li className="border-line rounded-card bg-background flex flex-col gap-4 border p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-ink font-bold">
          {name}
          <span className="text-ink-soft font-normal"> · {payment.user.email}</span>
        </p>
        <p className="text-ink text-sm">
          {payment.course.title} · {fmt(t.common.module, { number: payment.module.order })}
          {payment.group && ` · ${payment.group.name}`}
        </p>
        <p className="text-ink-soft text-sm">
          {formatPrice(payment.amountCents, payment.currency)} ·{' '}
          {t.status.provider[payment.provider]} ·{' '}
          <span className="font-mono">{payment.reference}</span> ·{' '}
          {formatDate(payment.createdAt, 'dateTime')}
          {payment.confirmedBy &&
            ` · ${fmt(p.confirmedBy, { name: `${payment.confirmedBy.firstName} ${payment.confirmedBy.lastName}` })}`}
        </p>
        {payment.note && <p className="text-ink-soft text-sm italic">{payment.note}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex h-7 items-center rounded-full px-3 text-xs font-bold',
            STATUS_CLASS[payment.status],
          )}
        >
          {t.status.payment[payment.status]}
        </span>
        {payment.receiptUrl && (
          <Button asChild variant="ghost" size="sm">
            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
              {p.receipt} <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        )}
        {payment.provider === 'BANK_TRANSFER' &&
          (payment.status === 'PENDING' || payment.status === 'EXPIRED') && (
            <ActionDialog
              trigger={
                <Button variant="chunky" size="sm" disabled={act.isPending}>
                  <Check data-icon="inline-start" /> {p.confirm}
                </Button>
              }
              title={p.confirmTitle}
              description={p.confirmText}
              confirmLabel={p.confirm}
              confirmVariant="chunky"
              note={note}
              onNote={setNote}
              onConfirm={() => act.mutate('confirm')}
              pending={act.isPending}
            />
          )}
        {payment.status === 'PENDING' && (
          <ActionDialog
            trigger={
              <Button variant="outline" size="sm" disabled={act.isPending}>
                <X data-icon="inline-start" /> {p.reject}
              </Button>
            }
            title={p.rejectTitle}
            description={p.rejectText}
            confirmLabel={p.reject}
            confirmVariant="destructive"
            note={note}
            onNote={setNote}
            onConfirm={() => act.mutate('reject')}
            pending={act.isPending}
          />
        )}
        {payment.status === 'CONFIRMED' && (
          <ActionDialog
            trigger={
              <Button variant="outline" size="sm" disabled={act.isPending}>
                <Undo2 data-icon="inline-start" /> {p.refund}
              </Button>
            }
            title={p.refundTitle}
            description={p.refundText}
            confirmLabel={p.refund}
            confirmVariant="destructive"
            note={note}
            onNote={setNote}
            onConfirm={() => act.mutate('refund')}
            pending={act.isPending}
          />
        )}
      </div>
    </li>
  );
}

function ActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant,
  note,
  onNote,
  onConfirm,
  pending,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: 'chunky' | 'destructive';
  note: string;
  onNote: (v: string) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`note-${title}`}>{t.adminLaunch.payments.note}</Label>
          <Textarea
            id={`note-${title}`}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="chunky-outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button
            variant={confirmVariant}
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
