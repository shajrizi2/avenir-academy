import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnCourse } from '@/components/learn/learn-course';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'My course' };

export default function LearnCoursePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <LearnCourse />
    </Suspense>
  );
}
