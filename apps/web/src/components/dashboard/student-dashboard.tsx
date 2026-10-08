'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { EnrollmentStatusBadge } from '@/components/course/enrollment-status-badge';
import { trackTheme } from '@/components/course/track-theme';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { myEnrollmentsQuery } from '@/lib/queries';
import { UpcomingSessions } from './upcoming-sessions';
import { cn } from '@/lib/utils';

export function StudentDashboard() {
  return (
    <>
      <UpcomingSessions />
      <MyCourses />
    </>
  );
}

function MyCourses() {
  const { data, isPending, error } = useQuery(myEnrollmentsQuery);

  return (
    <section className="space-y-4" aria-labelledby="my-courses">
      <h2 id="my-courses" className="text-ink text-subheading font-extrabold">
        My courses
      </h2>
      {isPending ? (
        <Skeleton className="rounded-card h-36 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You haven't joined a course yet"
          description="Browse the catalog and request a place. Module 1 unlocks as soon as an admin approves you."
          action={
            <Button asChild variant="chunky">
              <Link href="/courses">Browse courses</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {data.map((enrollment) => (
            <li key={enrollment.id}>
              <Card className="h-full">
                <CardHeader className="gap-3">
                  <TrackIcon slug={enrollment.course.slug} />
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      <Link href={`/courses/${enrollment.course.slug}`} className="hover:underline">
                        {enrollment.course.title}
                      </Link>
                    </CardTitle>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </div>
                  <CardDescription>{enrollment.course.summary}</CardDescription>
                  <p className="text-ink-soft text-sm">
                    Requested{' '}
                    <LocalDateTime value={enrollment.createdAt} options={{ dateStyle: 'medium' }} />
                  </p>
                  {enrollment.status === 'APPROVED' && (
                    <Button asChild variant="chunky" className="mt-2 self-start">
                      <Link href={`/learn/${enrollment.course.slug}`}>
                        Open course <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  )}
                  {enrollment.status === 'PENDING' && (
                    <p className="text-active-ink text-sm font-semibold">
                      We’ll contact you to confirm your seat. Module 1 opens once you’re approved.
                    </p>
                  )}
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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
