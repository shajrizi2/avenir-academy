'use client';

import { formatSqDate, formatSqSchedule, type GroupSummary } from '@ai-academy/shared';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { useAuth } from '@/lib/auth-context';
import { myEnrollmentsQuery } from '@/lib/queries';

interface EnrollPanelProps {
  courseId: string;
  courseSlug: string;
  groups: GroupSummary[];
}

/**
 * The course page's call to action: the upcoming groups with real seats left and a
 * "Regjistrohu" button into checkout, or the student's current state in the course.
 */
export function EnrollPanel({ courseId, courseSlug, groups }: EnrollPanelProps) {
  const { status, user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const enrollments = useQuery({ ...myEnrollmentsQuery, enabled: isStudent });
  const d = t.catalog.detail;

  if (status === 'loading' || (isStudent && enrollments.isPending)) {
    return <Skeleton className="rounded-button h-24 w-full" />;
  }
  if (user && !isStudent) {
    return <p className="text-ink-soft text-sm">{d.staffOnly}</p>;
  }

  const existing = enrollments.data?.find((e) => e.course.id === courseId);
  if (existing?.status === 'APPROVED') {
    return (
      <div className="space-y-3">
        <p className="text-passed-ink inline-flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-4" aria-hidden /> {d.enrolled}
        </p>
        <Button asChild variant="chunky" size="lg" className="w-full">
          <Link href={`/learn/${courseSlug}`}>{d.openCourse}</Link>
        </Button>
      </div>
    );
  }
  if (existing?.status === 'PENDING_PAYMENT' && existing.group) {
    return (
      <div className="space-y-3">
        <p className="text-active-ink font-semibold">{d.pendingPayment}</p>
        <Button asChild variant="chunky" size="lg" className="w-full">
          <Link href={`/checkout/${existing.group.id}`}>{d.continuePayment}</Link>
        </Button>
      </div>
    );
  }
  if (existing?.status === 'WAITLISTED') {
    return <p className="text-ink-soft text-sm font-semibold">{d.waitlisted}</p>;
  }
  if (existing?.status === 'PENDING') {
    return <p className="text-active-ink text-sm font-semibold">{d.pendingApproval}</p>;
  }
  if (existing?.status === 'REJECTED') {
    return <p className="text-ink-soft text-sm">{d.rejected}</p>;
  }

  if (groups.length === 0) {
    return <p className="text-ink-soft text-sm font-semibold">{d.noGroups}</p>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-ink text-sm font-extrabold">{d.groupsTitle}</h2>
      <ul className="space-y-3">
        {groups.map((group) => {
          const full = group.seatsLeft === 0;
          const href = user
            ? `/checkout/${group.id}`
            : `/register?next=${encodeURIComponent(`/checkout/${group.id}`)}`;
          return (
            <li key={group.id} className="border-line rounded-card space-y-2 border p-4">
              <p className="text-ink font-bold">{group.name}</p>
              <dl className="text-ink-soft space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0" aria-hidden />
                  <dt className="sr-only">{t.landing.tracks.startLabel}</dt>
                  <dd>
                    {fmt(d.groupStarts, {
                      date: formatSqDate(`${group.startDate}T12:00:00Z`, { weekday: true }),
                    })}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  <dt className="sr-only">{d.groupSchedule}</dt>
                  <dd>{formatSqSchedule(group)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0" aria-hidden />
                  <dt className="sr-only">{t.common.seats}</dt>
                  <dd
                    className={
                      full ? 'text-failed-ink font-semibold' : 'text-passed-ink font-semibold'
                    }
                  >
                    {full
                      ? d.full
                      : group.seatsLeft === 1
                        ? d.seatsOne
                        : fmt(d.seatsLeft, { count: group.seatsLeft })}
                  </dd>
                </div>
              </dl>
              <Button
                asChild
                variant={full ? 'chunky-outline' : 'chunky'}
                size="lg"
                className="w-full"
              >
                <Link href={href}>{full ? d.joinWaitlist : d.register}</Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
