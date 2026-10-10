'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen, Video } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trackTheme } from '@/components/course/track-theme';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { moduleQuery } from '@/lib/queries';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';
import { MaterialItem } from './material-item';
import { SessionCard } from './session-card';
import { TestCard } from './test-card';

/** A module for an enrolled student: live sessions with Join buttons, and materials. */
export function LearnModule() {
  const { courseSlug, moduleId } = useParams<{ courseSlug: string; moduleId: string }>();
  const { data: module, isPending, error } = useQuery(moduleQuery(moduleId));
  const now = useNow();

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) {
    return (
      <div className="space-y-4">
        <FormError message={errorMessage(error)} />
        <Link
          href={`/learn/${courseSlug}`}
          className="text-ink font-semibold underline underline-offset-4"
        >
          Back to the course
        </Link>
      </div>
    );
  }

  const theme = trackTheme(module.course.slug);
  const ended = (startsAt: string, durationMin: number) =>
    now > 0 && new Date(startsAt).getTime() + durationMin * 60_000 < now;
  const upcoming = module.sessions.filter((s) => !ended(s.startsAt, s.durationMin));
  const past = module.sessions.filter((s) => ended(s.startsAt, s.durationMin)).reverse();

  return (
    <>
      <Link
        href={`/learn/${module.course.slug}`}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {module.course.title}
      </Link>
      <header className={cn('rounded-card space-y-3 p-6 sm:p-8', theme.tint)}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-ink text-sm font-bold">Module {module.order}</p>
          {module.status && <ModuleStatusBadge status={module.status} />}
        </div>
        <h1 className="text-ink text-heading font-extrabold">{module.title}</h1>
        <p className="text-ink max-w-3xl">{module.description}</p>
        {module.instructor && (
          <p className="text-ink text-sm font-semibold">
            Instructor: {module.instructor.firstName} {module.instructor.lastName}
          </p>
        )}
      </header>

      {module.test && (
        <section aria-labelledby="test-title" className="space-y-4">
          <h2 id="test-title" className="text-ink text-subheading font-extrabold">
            Module test
          </h2>
          <TestCard test={module.test} status={module.status} />
        </section>
      )}

      <section aria-labelledby="sessions-title" className="space-y-4">
        <h2 id="sessions-title" className="text-ink text-subheading font-extrabold">
          Live sessions
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No upcoming sessions"
            description="Your instructor schedules the live classes. They will appear here with a Join button."
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <details className="group">
            <summary className="text-ink cursor-pointer py-2 font-semibold">
              Past sessions ({past.length})
            </summary>
            <ul className="mt-3 space-y-3">
              {past.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="materials-title" className="space-y-4">
        <h2 id="materials-title" className="text-ink text-subheading font-extrabold">
          Materials
        </h2>
        {module.materials.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No materials yet"
            description="Slides, worksheets and links from your instructor will appear here."
          />
        ) : (
          <ul className="space-y-3">
            {module.materials.map((material) => (
              <MaterialItem key={material.id} material={material} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
