'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { trackTheme } from '@/components/course/track-theme';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, plural, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { teachingModulesQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** Modules the instructor teaches (every module for admins), with the next session. */
export function TeachingModules() {
  const { user } = useAuth();
  const { data, isPending, error } = useQuery(teachingModulesQuery);
  const m = t.teach.index;

  if (isPending) return <Skeleton className="h-48 w-full rounded-none" />;
  if (error) return <FormError message={errorMessage(error)} />;
  if (data.length === 0) {
    const isAdmin = user?.role === 'ADMIN';
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={isAdmin ? m.emptyAdminTitle : m.emptyTitle}
        description={isAdmin ? m.emptyAdminText : m.emptyText}
      />
    );
  }

  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {data.map((module) => {
        const theme = trackTheme(module.course.slug);
        return (
          <li key={module.id} className="relative">
            <div className="border-line-strong bg-background hover:border-ink flex h-full flex-col gap-4 rounded-none border-2 p-6 transition-colors">
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    'border-ink text-ink flex size-11 shrink-0 items-center justify-center rounded-none border-2 font-extrabold',
                    theme.fill,
                  )}
                >
                  {module.order}
                </span>
                <div className="min-w-0">
                  <p className="text-ink-soft text-sm font-semibold">{module.course.title}</p>
                  <h2 className="text-ink text-lg font-bold">
                    <Link
                      href={`/training/teach/modules/${module.id}`}
                      className="after:absolute after:inset-0 after:rounded-none focus-visible:outline-none"
                    >
                      {module.title}
                    </Link>
                  </h2>
                </div>
              </div>
              <p className="text-ink flex items-center gap-2 text-sm">
                <CalendarClock className="text-ink-soft size-4" aria-hidden />
                {module.nextSession ? (
                  <span>
                    {fmt(m.next, { date: formatDate(module.nextSession.startsAt, 'longTime') })}
                  </span>
                ) : (
                  <span className="text-ink-soft">{m.noUpcoming}</span>
                )}
              </p>
              <p className="text-ink-soft mt-auto text-sm">
                {plural(module.studentCount, t.common.count.student, t.common.count.students)} ·{' '}
                {plural(module.sessionCount, t.common.count.session, t.common.count.sessions)} ·{' '}
                {plural(module.materialCount, t.common.count.material, t.common.count.materials)}
              </p>
              <span className="text-ink inline-flex items-center gap-1 text-sm font-bold">
                {m.manage} <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
