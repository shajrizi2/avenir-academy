import type { Metadata } from 'next';
import { CourseList } from '@/components/admin/courses/course-list';
import { PageHeader } from '@/components/page-header';

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
