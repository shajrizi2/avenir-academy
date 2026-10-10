import type { CourseSummary } from '@ai-academy/shared';
import { ArrowRight, CalendarDays, Layers } from 'lucide-react';
import Link from 'next/link';
import { LocalDateTime } from '@/components/local-date-time';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { trackTheme } from './track-theme';

/** Catalog card: a track-tinted illustration band, then title, summary and facts. */
export function CourseCard({ course }: { course: CourseSummary }) {
  const theme = trackTheme(course.slug);
  return (
    <Card variant="pressable" className="h-full gap-0 py-0">
      <div className={cn('flex items-center justify-center px-10 py-6', theme.tint)}>
        <theme.Illustration className="max-w-56" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h2 className="text-ink text-subheading font-extrabold">
          <Link
            href={`/courses/${course.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {course.title}
          </Link>
        </h2>
        <p className="text-ink-soft">{course.summary}</p>
        <div className="text-ink-soft mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-4" aria-hidden />
            {course.moduleCount} modules
          </span>
          {course.startDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              Starts <LocalDateTime value={course.startDate} options={{ dateStyle: 'medium' }} />
            </span>
          )}
        </div>
        <span className="text-ink inline-flex items-center gap-1 pt-2 font-bold">
          View course <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Card>
  );
}
