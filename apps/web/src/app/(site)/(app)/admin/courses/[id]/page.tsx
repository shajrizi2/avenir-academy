import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CourseEditor } from '@/components/admin/courses/course-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.courses_admin };

export default function AdminCoursePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <CourseEditor />
    </Suspense>
  );
}
