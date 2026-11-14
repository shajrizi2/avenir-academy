import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CourseGrid, CourseGridSkeleton } from '@/components/course/course-grid';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';

export const metadata: Metadata = {
  title: t.meta.pages.courses,
  description: t.meta.pages.coursesDescription,
};

export default function CoursesPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-12 sm:px-6 lg:py-16">
      <PageHeader title={t.catalog.title} description={t.catalog.description} />
      <Suspense fallback={<CourseGridSkeleton />}>
        <CourseGrid />
      </Suspense>
    </div>
  );
}
