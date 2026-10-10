import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CourseEditor } from '@/components/admin/courses/course-editor';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Edit course' };

export default function AdminCoursePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <CourseEditor />
    </Suspense>
  );
}
