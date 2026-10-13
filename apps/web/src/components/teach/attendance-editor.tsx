'use client';

import type { AttendanceInput, SessionAttendance } from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { attendanceQuery } from '@/lib/queries';

const m = t.teach.attendance;

export function AttendanceEditor() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error } = useQuery(attendanceQuery(id));

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  // Remount when the server data changes so the checkboxes start from the saved state.
  return <Roster key={JSON.stringify(data.records)} attendance={data} />;
}

function Roster({ attendance }: { attendance: SessionAttendance }) {
  const { session, records } = attendance;
  const queryClient = useQueryClient();
  const [present, setPresent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(records.map((r) => [r.user.id, r.present ?? false])),
  );
  const unrecorded = records.filter((r) => r.present === null).length;
  const presentCount = Object.values(present).filter(Boolean).length;

  const save = useMutation({
    mutationFn: (body: AttendanceInput) =>
      apiFetch<SessionAttendance>(`/sessions/${session.id}/attendance`, { method: 'PUT', body }),
    onSuccess: (saved) => {
      toast.success(m.saved);
      queryClient.setQueryData(attendanceQuery(session.id).queryKey, saved);
      void queryClient.invalidateQueries({ queryKey: ['modules', session.moduleId, 'sessions'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setAll = (value: boolean) =>
    setPresent(Object.fromEntries(records.map((r) => [r.user.id, value])));

  return (
    <>
      <Link
        href={`/teach/modules/${session.moduleId}`}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {session.module.title}
      </Link>
      <PageHeader title={fmt(m.title, { title: session.title })} />
      <p className="text-ink-soft -mt-4">
        {session.module.course.title} · <LocalDateTime value={session.startsAt} style="longTime" />
      </p>

      {records.length === 0 ? (
        <EmptyState icon={Users} title={m.emptyTitle} description={m.emptyText} />
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              records: records.map((r) => ({
                userId: r.user.id,
                present: present[r.user.id] ?? false,
              })),
            });
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink font-semibold" aria-live="polite">
              {fmt(m.summary, { present: presentCount, total: records.length })}
              {unrecorded > 0 && (
                <span className="text-ink-soft font-normal">
                  {' '}
                  {fmt(m.unsaved, { count: unrecorded })}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
                {m.markAll}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)}>
                {m.clear}
              </Button>
            </div>
          </div>
          <ul className="border-line rounded-card bg-background divide-line divide-y border">
            {records.map(({ user }) => {
              const checkboxId = `present-${user.id}`;
              return (
                <li key={user.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <Checkbox
                    id={checkboxId}
                    checked={present[user.id] ?? false}
                    onCheckedChange={(checked) =>
                      setPresent((prev) => ({ ...prev, [user.id]: checked === true }))
                    }
                  />
                  <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer py-1">
                    <span className="text-ink block font-bold">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-ink-soft block truncate text-sm">{user.email}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Button type="submit" variant="chunky" size="lg" disabled={save.isPending}>
            {save.isPending ? t.common.saving : m.save}
          </Button>
        </form>
      )}
    </>
  );
}
