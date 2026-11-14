import type { Metadata } from 'next';
import { InstructorList } from '@/components/admin/landing/instructor-list';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.instructors };

export default function AdminInstructorListPage() {
  return (
    <>
      <PageHeader title={t.admin.instructors.title} description={t.admin.instructors.description} />
      <InstructorList />
    </>
  );
}
