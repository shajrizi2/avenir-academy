'use client';

import type { EnrollmentSummary } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { EnrollmentStatusBadge } from '@/components/course/enrollment-status-badge';
import { trackTheme } from '@/components/course/track-theme';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { myEnrollmentsQuery, myProgressQuery } from '@/lib/queries';
import { ContinueCard } from './continue-card';
import { CourseProgressBlock } from './course-progress';
import { cn } from '@/lib/utils';
import { UpcomingSessions } from './upcoming-sessions';

export function StudentDashboard() {
  return (
    <>
      <UpcomingSessions />
      <ContinueCard />
      <MyCourses />
    </>
  );
}

function MyCourses() {
  const { data, isPending, error } = useQuery(myEnrollmentsQuery);
  const hasApproved = data?.some((e) => e.status === 'APPROVED') ?? false;
  const progress = useQuery({ ...myProgressQuery, enabled: hasApproved });

  return (
    <section className="space-y-4" aria-labelledby="my-courses">
      <h2 id="my-courses" className="text-ink text-subheading font-extrabold">
        {t.dashboard.myCourses}
      </h2>
      {isPending ? (
        <Skeleton className="rounded-card h-36 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t.dashboard.noCoursesTitle}
          description={t.dashboard.noCoursesText}
          action={
            <Button asChild variant="chunky">
              <Link href="/courses">{t.dashboard.browse}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {data.map((enrollment) => {
            const courseProgress = progress.data?.find((p) => p.course.id === enrollment.course.id);
            return (
              <li key={enrollment.id}>
                <Card className="h-full">
                  <CardHeader className="gap-3">
                    <TrackIcon slug={enrollment.course.slug} />
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>
                        <Link
                          href={`/courses/${enrollment.course.slug}`}
                          className="hover:underline"
                        >
                          {enrollment.course.title}
                        </Link>
                      </CardTitle>
                      <EnrollmentStatusBadge status={enrollment.status} />
                    </div>
                    <CardDescription>{enrollment.course.summary}</CardDescription>
                    {enrollment.group && (
                      <p className="text-ink text-sm font-semibold">
                        {fmt(t.dashboard.group, { name: enrollment.group.name })}
                        <span className="text-ink-soft font-normal">
                          {' '}
                          ·{' '}
                          {fmt(t.dashboard.starts, {
                            date: formatDate(enrollment.group.startDate, 'date'),
                          })}
                        </span>
                      </p>
                    )}
                    {enrollment.status === 'APPROVED' ? (
                      courseProgress ? (
                        <CourseProgressBlock progress={courseProgress} />
                      ) : (
                        progress.isPending && <Skeleton className="h-16 w-full" />
                      )
                    ) : (
                      <p className="text-ink-soft text-sm">
                        {fmt(t.dashboard.requested, {
                          date: formatDate(enrollment.createdAt, 'date'),
                        })}
                      </p>
                    )}
                    <EnrollmentNotice enrollment={enrollment} />
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** What the student should know or do next, depending on the enrollment's status. */
function EnrollmentNotice({ enrollment }: { enrollment: EnrollmentSummary }) {
  switch (enrollment.status) {
    case 'APPROVED':
      return (
        <Button asChild variant="chunky" className="mt-2 self-start">
          <Link href={`/learn/${enrollment.course.slug}`}>
            {t.dashboard.openCourse} <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      );
    case 'PENDING':
      return <p className="text-active-ink text-sm font-semibold">{t.dashboard.pendingApproval}</p>;
    case 'PENDING_PAYMENT':
      return (
        <>
          <p className="text-active-ink text-sm font-semibold">
            {enrollment.holdExpiresAt
              ? fmt(t.dashboard.pendingPayment, {
                  date: formatDate(enrollment.holdExpiresAt, 'dateTime'),
                })
              : t.dashboard.pendingPaymentNoHold}
          </p>
          {enrollment.group && (
            <Button asChild variant="chunky-outline" className="mt-2 self-start">
              <Link href={`/checkout/${enrollment.group.id}`}>
                {t.dashboard.continuePayment} <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </>
      );
    case 'WAITLISTED':
      return <p className="text-ink-soft text-sm font-semibold">{t.dashboard.waitlisted}</p>;
    case 'EXPIRED':
      return <p className="text-failed-ink text-sm font-semibold">{t.dashboard.expired}</p>;
    default:
      return null;
  }
}

function TrackIcon({ slug }: { slug: string }) {
  const theme = trackTheme(slug);
  return (
    <span
      className={cn(
        'border-ink text-ink flex size-11 items-center justify-center rounded-xl border-2',
        theme.fill,
      )}
    >
      <theme.Icon className="size-5" aria-hidden />
    </span>
  );
}
