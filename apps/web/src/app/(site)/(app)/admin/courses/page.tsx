import type { Metadata } from 'next';
import { CourseList } from '@/components/admin/courses/course-list';
import { PageHeader } from '@/components/page-header';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Courses' };

export default function AdminCoursesPage() {
  return (
    <>
      <PageHeader
        title="Courses"
        description="Create courses, add their modules in order and assign an instructor to each module."
      />
      <CourseList />
    </>
  );
}
