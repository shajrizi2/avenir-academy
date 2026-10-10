import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CourseGrid, CourseGridSkeleton } from '@/components/course/course-grid';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Browse live AI and digital marketing courses.',
};

export default function CoursesPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-12 sm:px-6 lg:py-16">
      <PageHeader
        title="Courses"
        description="Each course has four monthly modules taught live on Google Meet. Pass each module's test to unlock the next."
      />
      <Suspense fallback={<CourseGridSkeleton />}>
        <CourseGrid />
      </Suspense>
    </div>
  );
}
