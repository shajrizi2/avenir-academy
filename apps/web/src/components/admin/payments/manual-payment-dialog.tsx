'use client';

import type { AdminEnrollment, CourseDetail, Paginated } from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';

const selectClass =
  'border-input bg-background text-ink focus-visible:border-ink focus-visible:ring-ring/40 h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-3';

/** Records a payment received outside the platform (cash, a transfer without a reference). */
export function ManualPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const p = t.adminLaunch.payments;

  const enrollments = useQuery({
    queryKey: ['enrollments', 'manual-payment'],
    queryFn: () =>
      apiFetch<Paginated<AdminEnrollment>>('/enrollments', { query: { page: 1, pageSize: 100 } }),
    enabled: open,
  });
  const selected = enrollments.data?.items.find((e) => e.id === enrollmentId);
  const course = useQuery({
    queryKey: ['courses', 'by-id', selected?.course.id ?? ''],
    queryFn: () => apiFetch<CourseDetail>(`/courses/by-id/${selected?.course.id}`),
    enabled: Boolean(selected),
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch('/payments/manual', {
        method: 'POST',
        body: { enrollmentId, moduleId, note: note || undefined },
      }),
    onSuccess: () => {
      toast.success(p.manualSaved);
      setOpen(false);
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="chunky-outline">
          <Plus data-icon="inline-start" /> {p.manual}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{p.manualTitle}</DialogTitle>
          <DialogDescription>{p.manualText}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormError message={error} />
          <div className="grid gap-2">
            <Label htmlFor="manual-enrollment">{p.manualEnrollment}</Label>
            <select
              id="manual-enrollment"
              className={selectClass}
              value={enrollmentId}
              onChange={(e) => {
                setEnrollmentId(e.target.value);
                setModuleId('');
              }}
            >
              <option value="">—</option>
              {(enrollments.data?.items ?? [])
                .filter((e) => e.status !== 'REJECTED' && e.status !== 'CANCELLED')
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user.firstName} {e.user.lastName} · {e.course.title}
                    {e.group ? ` · ${e.group.name}` : ''} · {t.status.enrollment[e.status]}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manual-module">{p.manualModule}</Label>
            <select
              id="manual-module"
              className={selectClass}
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              disabled={!selected}
            >
              <option value="">—</option>
              {(course.data?.modules ?? []).map((m) => (
                <option key={m.id} value={m.id} disabled={selected?.paidModuleIds.includes(m.id)}>
                  {fmt(t.common.module, { number: m.order })}: {m.title}
                  {selected?.paidModuleIds.includes(m.id) ? ` (${t.payments.paid})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manual-note">{p.note}</Label>
            <Textarea
              id="manual-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <Button
              variant="chunky"
              disabled={!enrollmentId || !moduleId || save.isPending}
              onClick={() => {
                setError(null);
                save.mutate();
              }}
            >
              {save.isPending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
