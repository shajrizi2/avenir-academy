'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';
import { nextLessonQuery } from '@/lib/queries';

/** "Continue where you left off": the next unfinished offline lesson. Hidden when there is none. */
export function ContinueCard() {
  const { data } = useQuery(nextLessonQuery);
  if (!data) return null;
  const d = t.dashboard;
  const href = `/learn/${data.module.course.slug}/${data.module.id}/lessons/${data.lesson.id}`;
  return (
    <section
      aria-labelledby="continue-title"
      className="border-ink rounded-card bg-track-ai-tint flex flex-col gap-4 border-2 p-6 shadow-[0_4px_0_var(--ink)] sm:flex-row sm:items-center"
    >
      <span className="bg-background border-ink text-ink flex size-14 shrink-0 items-center justify-center rounded-2xl border-2">
        <BookOpenCheck className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="continue-title" className="text-ink text-lg font-extrabold">
          {d.continueTitle}
        </h2>
        <p className="text-ink font-semibold">{data.lesson.title}</p>
        <p className="text-ink-soft text-sm">
          {fmt(d.continueText, {
            done: data.completedLessons,
            total: data.totalLessons,
            module: `${fmt(t.common.module, { number: data.module.order })}: ${data.module.title}`,
          })}
        </p>
      </div>
      <Button asChild variant="chunky">
        <Link href={href}>
          {d.continueCta} <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </section>
  );
}
