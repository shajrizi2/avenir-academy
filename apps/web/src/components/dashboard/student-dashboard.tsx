'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { EnrollmentStatusBadge } from '@/components/course/enrollment-status-badge';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { myEnrollmentsQuery } from '@/lib/queries';

export function StudentDashboard() {
  const { data, isPending, error } = useQuery(myEnrollmentsQuery);

  return (
    <section className="space-y-4" aria-labelledby="my-courses">
      <h2 id="my-courses" className="text-lg font-semibold text-slate-900">
        My courses
      </h2>
      {isPending ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You haven't joined a course yet"
          description="Browse the catalog and request a place. Module 1 unlocks as soon as an admin approves you."
          action={
            <Button asChild>
              <Link href="/courses">Browse courses</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((enrollment) => (
            <li key={enrollment.id}>
              <Card className="h-full rounded-xl">
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      <Link href={`/courses/${enrollment.course.slug}`} className="hover:underline">
                        {enrollment.course.title}
                      </Link>
                    </CardTitle>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </div>
                  <CardDescription>{enrollment.course.summary}</CardDescription>
                  <p className="text-muted-foreground text-xs">
                    Requested{' '}
                    <LocalDateTime value={enrollment.createdAt} options={{ dateStyle: 'medium' }} />
                  </p>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
