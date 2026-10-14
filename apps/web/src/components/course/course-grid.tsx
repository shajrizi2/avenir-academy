import type { CourseSummary } from '@ai-academy/shared';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
import { serverGet } from '@/lib/server-api';
import { CourseCard } from './course-card';

/** Fetches published courses at request time; render inside <Suspense>. */
export async function CourseGrid() {
  const courses = await serverGet<CourseSummary[]>('/courses');
  if (courses.length === 0) {
    return (
      <EmptyState icon={BookOpen} title={t.catalog.emptyTitle} description={t.catalog.emptyText} />
    );
  }
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <li
          key={course.id}
          className="rounded-card has-focus-visible:ring-ring/50 relative has-focus-visible:ring-3"
        >
          <CourseCard course={course} />
        </li>
      ))}
    </ul>
  );
}

export function CourseGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="rounded-card h-96" />
      ))}
    </div>
  );
}
