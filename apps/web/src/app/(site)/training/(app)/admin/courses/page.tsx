import type { Metadata } from 'next';
import { CourseList } from '@/components/admin/courses/course-list';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.courses_admin };

export default function AdminCoursesPage() {
  return (
    <>
      <PageHeader title={t.admin.courses.title} description={t.admin.courses.description} />
      <CourseList />
    </>
  );
}
