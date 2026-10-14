'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CreditCard, Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trackTheme } from '@/components/course/track-theme';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { learnCourseQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** A student's course: every module with their own status; unlocked ones open. */
export function LearnCourse() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const { data: course, isPending, error } = useQuery(learnCourseQuery(courseSlug));

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  const theme = trackTheme(course.slug);

  return (
    <>
      <header className={cn('rounded-card flex items-center gap-6 p-6 sm:p-8', theme.tint)}>
        <div className="min-w-0 flex-1">
          <p className="text-ink text-sm font-bold">{t.learn.yourCourse}</p>
          <h1 className="text-ink text-heading mt-1 font-extrabold">{course.title}</h1>
          <p className="text-ink mt-2 max-w-2xl">{course.summary}</p>
          {course.group && (
            <p className="text-ink mt-3 text-sm font-semibold">
              {fmt(t.learn.group, {
                name: course.group.name,
                date: formatDate(course.group.startDate, 'date'),
              })}
            </p>
          )}
        </div>
        <theme.Illustration className="hidden w-48 shrink-0 md:block" />
      </header>

      <section aria-labelledby="modules-title" className="space-y-4">
        <h2 id="modules-title" className="text-ink text-subheading font-extrabold">
          {t.learn.modules}
        </h2>
        <ol className="space-y-3">
          {course.modules.map((module) => {
            const locked = module.status === 'LOCKED';
            const content = (
              <>
                <span
                  className={cn(
                    'border-ink flex size-11 shrink-0 items-center justify-center rounded-full border-2 font-extrabold',
                    locked ? 'bg-background text-ink-soft' : cn(theme.fill, 'text-ink'),
                  )}
                  aria-hidden
                >
                  {locked ? <Lock className="size-4" /> : module.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-soft text-sm font-semibold">
                    {fmt(t.common.module, { number: module.order })}
                  </p>
                  <p className="text-ink font-bold">{module.title}</p>
                  <p className="text-ink-soft mt-1 text-sm">{module.description}</p>
                  {module.lessonCount > 0 && (
                    <p className="text-ink-soft mt-1 text-xs font-semibold">
                      {fmt(t.learn.lessonsProgress, {
                        done: module.completedLessons,
                        total: module.lessonCount,
                      })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <ModuleStatusBadge status={module.status} />
                  <PaymentPill paid={module.paid} pending={module.paymentPending} />
                  {!locked && <ArrowRight className="text-ink size-5" aria-hidden />}
                </div>
              </>
            );
            return (
              <li key={module.id} className="space-y-2">
                {/* Locked: muted by a dashed outline and soft fill, not opacity, so text keeps its contrast. */}
                {locked ? (
                  <div className="border-line-strong rounded-card bg-soft flex items-start gap-4 border border-dashed p-5">
                    {content}
                  </div>
                ) : (
                  <Link
                    href={`/learn/${course.slug}/${module.id}`}
                    className="pressable border-line-strong rounded-card bg-background hover:border-ink focus-visible:ring-ring/50 flex items-start gap-4 p-5 outline-none [--press:var(--border-strong)] hover:[--press:var(--ink)] focus-visible:ring-3"
                  >
                    {content}
                  </Link>
                )}
                {!module.paid && !module.paymentPending && course.group && (
                  <div className="flex justify-end">
                    <Button asChild variant="chunky-outline" size="sm">
                      <Link href={`/checkout/${course.group.id}?module=${module.id}`}>
                        <CreditCard data-icon="inline-start" />{' '}
                        {fmt(t.learn.payModule, { number: module.order })}
                      </Link>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-ink-soft text-sm">{t.learn.moduleHint}</p>
      </section>
    </>
  );
}

/** Whether this month is paid: a small pill next to the module status. */
function PaymentPill({ paid, pending }: { paid: boolean; pending: boolean }) {
  const label = paid ? t.learn.paid : pending ? t.learn.paymentPending : t.learn.unpaid;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        paid
          ? 'bg-passed-tint text-passed-ink'
          : pending
            ? 'bg-active-tint text-active-ink'
            : 'bg-locked-tint text-locked-ink',
      )}
    >
      {label}
    </span>
  );
}
