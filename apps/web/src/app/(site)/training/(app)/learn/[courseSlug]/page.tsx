import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnCourse } from '@/components/learn/learn-course';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.myCourse };

export default function LearnCoursePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-none" />}>
      <LearnCourse />
    </Suspense>
  );
}
