import type { Metadata } from 'next';
import { InstructorList } from '@/components/admin/landing/instructor-list';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Instructors' };

export default function AdminInstructorListPage() {
  return (
    <>
      <PageHeader
        title="Instructors"
        description="Public profiles shown on the landing page. Assign instructors to modules on each course page."
      />
      <InstructorList />
    </>
  );
}
