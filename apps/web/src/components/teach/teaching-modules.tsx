'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { trackTheme } from '@/components/course/track-theme';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { teachingModulesQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** Modules the instructor teaches (every module for admins), with the next session. */
export function TeachingModules() {
  const { user } = useAuth();
  const { data, isPending, error } = useQuery(teachingModulesQuery);

  if (isPending) return <Skeleton className="rounded-card h-48 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={user?.role === 'ADMIN' ? 'No modules yet' : 'No modules assigned to you yet'}
        description={
          user?.role === 'ADMIN'
            ? 'Add modules to a course on the Courses page.'
            : 'An admin assigns modules to instructors. They will appear here.'
        }
      />
    );
  }

  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {data.map((module) => {
        const theme = trackTheme(module.course.slug);
        return (
          <li key={module.id} className="relative">
            <div className="border-line-strong rounded-card bg-background hover:border-ink flex h-full flex-col gap-4 border-2 p-6 transition-colors">
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    'border-ink text-ink flex size-11 shrink-0 items-center justify-center rounded-xl border-2 font-extrabold',
                    theme.fill,
                  )}
                >
                  {module.order}
                </span>
                <div className="min-w-0">
                  <p className="text-ink-soft text-sm font-semibold">{module.course.title}</p>
                  <h2 className="text-ink text-lg font-bold">
                    <Link
                      href={`/teach/modules/${module.id}`}
                      className="after:rounded-card after:absolute after:inset-0 focus-visible:outline-none"
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
                    Next:{' '}
                    <LocalDateTime
                      value={module.nextSession.startsAt}
                      options={{
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      }}
                    />
                  </span>
                ) : (
                  <span className="text-ink-soft">No upcoming session</span>
                )}
              </p>
              <p className="text-ink-soft mt-auto text-sm">
                {module.studentCount} student{module.studentCount === 1 ? '' : 's'} ·{' '}
                {module.sessionCount} session{module.sessionCount === 1 ? '' : 's'} ·{' '}
                {module.materialCount} material{module.materialCount === 1 ? '' : 's'}
              </p>
              <span className="text-ink inline-flex items-center gap-1 text-sm font-bold">
                Manage <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
