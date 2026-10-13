'use client';

import { type AdminGroup, formatSqDate, formatSqSchedule } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { adminCoursesQuery, adminGroupsQuery } from '@/lib/queries';
import { GroupFormDialog, type GroupFormValues } from './group-form-dialog';

const STATUS_VARIANT: Record<AdminGroup['status'], 'ai' | 'marketing' | 'secondary' | 'outline'> = {
  OPEN: 'ai',
  FULL: 'marketing',
  RUNNING: 'secondary',
  FINISHED: 'outline',
};

export function GroupList() {
  const queryClient = useQueryClient();
  const groups = useQuery(adminGroupsQuery());
  const courses = useQuery(adminCoursesQuery);
  const g = t.adminLaunch.groups;

  async function create({ courseId, ...values }: GroupFormValues) {
    await apiFetch(`/courses/${courseId}/groups`, { method: 'POST', body: toBody(values) });
    toast.success(g.created);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
  }

  return (
    <div className="space-y-6">
      <GroupFormDialog
        title={g.new}
        description={g.newDescription}
        courses={courses.data ?? []}
        onSubmit={create}
        trigger={
          <Button variant="chunky" disabled={!courses.data?.length}>
            <Plus data-icon="inline-start" /> {g.new}
          </Button>
        }
      />
      {groups.isPending ? (
        <Skeleton className="rounded-card h-48 w-full" />
      ) : groups.error ? (
        <FormError message={errorMessage(groups.error)} />
      ) : groups.data.length === 0 ? (
        <EmptyState icon={CalendarRange} title={g.emptyTitle} description={g.emptyText} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {groups.data.map((group) => (
            <li key={group.id} className="relative">
              <div className="border-line rounded-card bg-background hover:border-ink flex h-full flex-col gap-3 border-2 p-5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink-soft text-sm font-semibold">{group.course.title}</p>
                    <h2 className="text-ink text-lg font-bold">
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="after:rounded-card after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {group.name}
                      </Link>
                    </h2>
                  </div>
                  <Badge variant={STATUS_VARIANT[group.status]}>
                    {t.status.group[group.status]}
                  </Badge>
                </div>
                <p className="text-ink text-sm">
                  {formatSqDate(`${group.startDate}T12:00:00Z`, { weekday: true })} ·{' '}
                  {formatSqSchedule(group)}
                </p>
                <p className="text-ink-soft mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden />
                    {fmt(g.seats, { left: group.seatsLeft, capacity: group.capacity })}
                  </span>
                  <span>{fmt(g.enrolled, { count: group.enrolledCount })}</span>
                  {group.heldCount > 0 && <span>{fmt(g.held, { count: group.heldCount })}</span>}
                  {group.waitlistedCount > 0 && (
                    <span>{fmt(g.waitlisted, { count: group.waitlistedCount })}</span>
                  )}
                  <span>{fmt(g.sessions, { count: group.sessionCount })}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Empty strings clear the optional fields on the API. */
export function toBody(values: Omit<GroupFormValues, 'courseId'>) {
  return {
    ...values,
    instructorId: values.instructorId || null,
    meetUrl: values.meetUrl || null,
  };
}
