'use client';

import { formatSqDate, formatSqSchedule, type GroupStudent } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, RefreshCw, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EnrollmentStatusBadge } from '@/components/course/enrollment-status-badge';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { adminGroupQuery, groupStudentsQuery } from '@/lib/queries';
import { GroupFormDialog, type GroupFormValues } from './group-form-dialog';
import { toBody } from './group-list';

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const group = useQuery(adminGroupQuery(id));
  const students = useQuery(groupStudentsQuery(id));
  const g = t.adminLaunch.groups;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] }),
      queryClient.invalidateQueries({ queryKey: ['groups', id] }),
    ]);

  async function save({ courseId: _courseId, ...values }: GroupFormValues) {
    await apiFetch(`/groups/${id}`, { method: 'PATCH', body: toBody(values) });
    toast.success(g.saved);
    await refresh();
  }

  async function regenerate() {
    await apiFetch(`/groups/${id}/sessions/regenerate`, { method: 'POST' });
    toast.success(g.regenerated);
    await refresh();
  }

  async function remove() {
    try {
      await apiFetch(`/groups/${id}`, { method: 'DELETE' });
      toast.success(g.deleted);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
      router.push('/admin/groups');
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  if (group.isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (group.error) return <FormError message={errorMessage(group.error)} />;
  const data = group.data;

  return (
    <>
      <Link
        href="/admin/groups"
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {g.title}
      </Link>
      <PageHeader
        title={data.name}
        description={`${data.course.title} · ${formatSqDate(`${data.startDate}T12:00:00Z`, { weekday: true })} · ${formatSqSchedule(data)}`}
        actions={
          <>
            <GroupFormDialog
              title={g.edit}
              group={data}
              onSubmit={save}
              trigger={
                <Button variant="chunky-outline">
                  <Pencil data-icon="inline-start" /> {t.common.edit}
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <RefreshCw data-icon="inline-start" /> {g.regenerate}
                </Button>
              }
              title={g.regenerateTitle}
              description={g.regenerateText}
              confirmLabel={g.regenerate}
              confirmVariant="chunky"
              onConfirm={regenerate}
            />
            <ConfirmDialog
              trigger={
                <Button variant="destructive">
                  <Trash2 data-icon="inline-start" /> {t.common.delete}
                </Button>
              }
              title={g.deleteTitle}
              description={g.deleteText}
              confirmLabel={t.common.delete}
              onConfirm={remove}
            />
          </>
        }
      />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t.status.group[data.status]}
          value={fmt(g.seats, { left: data.seatsLeft, capacity: data.capacity })}
        />
        <Stat
          label={fmt(g.enrolled, { count: data.enrolledCount })}
          value={fmt(g.held, { count: data.heldCount })}
        />
        <Stat
          label={fmt(g.waitlisted, { count: data.waitlistedCount })}
          value={fmt(g.sessions, { count: data.sessionCount })}
        />
        <Stat
          label={
            data.instructor
              ? `${data.instructor.firstName} ${data.instructor.lastName}`
              : t.common.noInstructor
          }
          value={fmt(g.endDate, { date: formatSqDate(`${data.endDate}T12:00:00Z`) })}
        />
      </dl>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Users className="size-5" aria-hidden /> {g.students}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : students.error ? (
            <FormError message={errorMessage(students.error)} />
          ) : students.data.length === 0 ? (
            <EmptyState icon={Users} title={g.noStudents} description="" />
          ) : (
            <ul className="space-y-3">
              {students.data.map((s) => (
                <StudentRow key={s.enrollmentId} student={s} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line rounded-card bg-background border p-4">
      <dt className="text-ink-soft text-sm">{label}</dt>
      <dd className="text-ink mt-1 font-bold">{value}</dd>
    </div>
  );
}

function StudentRow({ student }: { student: GroupStudent }) {
  const e = t.adminLaunch.enrollments;
  return (
    <li className="border-line rounded-card flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-ink font-bold">
          {student.user.firstName} {student.user.lastName}
          <span className="text-ink-soft font-normal"> · {student.user.email}</span>
        </p>
        <p className="text-ink-soft text-sm">
          {fmt(e.requested, { date: formatDate(student.createdAt, 'dateTime') })}
          {student.holdExpiresAt &&
            ` · ${fmt(e.holdUntil, { date: formatDate(student.holdExpiresAt, 'longTime') })}`}
          {' · '}
          {fmt(e.paidMonths, { count: student.paidModuleIds.length })}
        </p>
      </div>
      <EnrollmentStatusBadge status={student.status} />
    </li>
  );
}
