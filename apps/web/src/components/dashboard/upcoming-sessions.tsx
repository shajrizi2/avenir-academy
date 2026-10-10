'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FormError } from '@/components/form-error';
import { SessionCard } from '@/components/learn/session-card';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { upcomingSessionsQuery } from '@/lib/queries';

/** The student's next live classes across their unlocked modules. Hidden when there are none. */
export function UpcomingSessions() {
  const { data, isPending, error } = useQuery(upcomingSessionsQuery);

  if (isPending) return <Skeleton className="rounded-card h-28 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  if (data.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="upcoming-sessions">
      <h2 id="upcoming-sessions" className="text-ink text-subheading font-extrabold">
        Upcoming live sessions
      </h2>
      <ul className="space-y-3">
        {data.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            context={
              <Link
                href={`/learn/${session.module.course.slug}/${session.module.id}`}
                className="hover:text-ink underline-offset-4 hover:underline"
              >
                {session.module.course.title} · Module {session.module.order}:{' '}
                {session.module.title}
              </Link>
            }
          />
        ))}
      </ul>
    </section>
  );
}
