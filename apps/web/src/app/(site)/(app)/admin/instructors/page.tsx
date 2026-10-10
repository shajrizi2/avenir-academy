import type { Metadata } from 'next';
import { InstructorList } from '@/components/admin/landing/instructor-list';
import { PageHeader } from '@/components/page-header';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

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
