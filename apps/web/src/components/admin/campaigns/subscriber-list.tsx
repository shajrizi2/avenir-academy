'use client';

import type { AdminSubscribers } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fmt, t } from '@/i18n/messages';
import { apiDownload, apiFetch, errorMessage } from '@/lib/api';

const s = t.adminSubscribers;

/** Every email stored by the job board's sign-in, with its consent (PLAN D37). */
export function SubscriberList() {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ['admin-subscribers'],
    queryFn: () => apiFetch<AdminSubscribers>('/admin/subscribers'),
  });

  async function remove(id: string) {
    try {
      await apiFetch(`/admin/subscribers/${id}`, { method: 'DELETE' });
      toast.success(s.deleted);
      await queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] });
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <>
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <Button
            variant="chunky-outline"
            onClick={() => void apiDownload('/admin/subscribers/export.csv', 'email-et.csv')}
          >
            <Download data-icon="inline-start" /> {s.export}
          </Button>
        }
      />
      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : (
        <>
          <p className="text-ink font-semibold">
            {fmt(s.counts, { total: data.total, consenting: data.consenting })}
          </p>
          {data.subscribers.length === 0 ? (
            <p className="text-ink-soft">{s.empty}</p>
          ) : (
            <div className="border-line bg-background border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{s.email}</TableHead>
                    <TableHead>{s.consent}</TableHead>
                    <TableHead>{s.joined}</TableHead>
                    <TableHead className="sr-only">{s.delete}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.subscribers.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-ink font-medium">{row.email}</TableCell>
                      <TableCell>
                        {row.marketingConsent ? s.yes : row.unsubscribedAt ? s.unsubscribed : s.no}
                      </TableCell>
                      <TableCell>
                        <LocalDateTime value={row.createdAt} style="date" />
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${s.delete} ${row.email}`}
                            >
                              <Trash2 />
                            </Button>
                          }
                          title={s.deleteTitle}
                          description={s.deleteDescription}
                          confirmLabel={s.delete}
                          onConfirm={() => remove(row.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </>
  );
}
