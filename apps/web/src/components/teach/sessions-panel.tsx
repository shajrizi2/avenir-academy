'use client';

import type { StaffSession } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ExternalLink, Pencil, Trash2, UserCheck, Video } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { moduleSessionsQuery } from '@/lib/queries';
import { useNow } from '@/lib/use-now';
import { SessionFormDialog, type SessionValues } from './session-form-dialog';

const m = t.teach.sessions;

/** Live sessions of one module: schedule, edit, delete and open attendance. */
export function SessionsPanel({ moduleId }: { moduleId: string }) {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(moduleSessionsQuery(moduleId));
  // 0 until the client clock is known: everything counts as upcoming until then.
  const now = useNow();

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['modules', moduleId] }),
      queryClient.invalidateQueries({ queryKey: ['me', 'modules'] }),
    ]);

  async function create(values: SessionValues) {
    await apiFetch(`/modules/${moduleId}/sessions`, { method: 'POST', body: values });
    toast.success(m.scheduled);
    await refresh();
  }

  const ended = (s: StaffSession) =>
    now > 0 && new Date(s.startsAt).getTime() + s.durationMin * 60_000 < now;
  const upcoming = data?.filter((s) => !ended(s)) ?? [];
  const past = (data?.filter(ended) ?? []).reverse();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle as="h2" className="flex items-center gap-2">
          <Video className="size-5" aria-hidden /> {m.title}
        </CardTitle>
        <SessionFormDialog
          title={m.schedule}
          onSubmit={create}
          trigger={
            <Button variant="chunky" size="sm">
              <CalendarPlus data-icon="inline-start" /> {m.add}
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-6">
        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : error ? (
          <FormError message={errorMessage(error)} />
        ) : data.length === 0 ? (
          <EmptyState icon={Video} title={m.emptyTitle} description={m.emptyText} />
        ) : (
          <>
            <SessionList title={m.upcoming} sessions={upcoming} onChanged={refresh} />
            <SessionList title={m.past} sessions={past} onChanged={refresh} past />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SessionList({
  title,
  sessions,
  onChanged,
  past = false,
}: {
  title: string;
  sessions: StaffSession[];
  onChanged: () => Promise<unknown>;
  past?: boolean;
}) {
  if (sessions.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-ink-soft text-sm font-bold tracking-wide uppercase">{title}</h3>
      <ul className="space-y-3">
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} onChanged={onChanged} past={past} />
        ))}
      </ul>
    </section>
  );
}

function SessionRow({
  session,
  onChanged,
  past,
}: {
  session: StaffSession;
  onChanged: () => Promise<unknown>;
  past: boolean;
}) {
  async function update(values: SessionValues) {
    await apiFetch(`/sessions/${session.id}`, { method: 'PATCH', body: values });
    toast.success(m.saved);
    await onChanged();
  }

  async function remove() {
    try {
      await apiFetch(`/sessions/${session.id}`, { method: 'DELETE' });
      toast.success(m.deleted);
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <li className="border-line rounded-card flex flex-col gap-3 border p-4 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-ink font-bold">{session.title}</p>
        <p className="text-ink-soft text-sm">
          <LocalDateTime value={session.startsAt} style="longTime" /> · {session.durationMin}{' '}
          {t.common.minShort}
        </p>
        {past && (
          <Badge variant={session.presentCount > 0 ? 'secondary' : 'outline'}>
            {fmt(m.present, { count: session.presentCount })}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={past ? 'chunky' : 'outline'} size="sm">
          <Link href={`/teach/sessions/${session.id}`}>
            <UserCheck data-icon="inline-start" /> {m.attendance}
          </Link>
        </Button>
        {session.meetUrl && !past && (
          <Button asChild variant="outline" size="sm">
            <a href={session.meetUrl} target="_blank" rel="noopener noreferrer">
              {m.openMeet} <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        )}
        <SessionFormDialog
          title={m.edit}
          session={session}
          onSubmit={update}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fmt(m.editAria, { title: session.title })}
            >
              <Pencil />
            </Button>
          }
        />
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fmt(m.deleteAria, { title: session.title })}
            >
              <Trash2 />
            </Button>
          }
          title={m.deleteTitle}
          description={m.deleteText}
          confirmLabel={m.deleteConfirm}
          onConfirm={remove}
        />
      </div>
    </li>
  );
}
