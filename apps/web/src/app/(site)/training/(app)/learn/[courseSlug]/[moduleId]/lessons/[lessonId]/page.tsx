import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LessonView } from '@/components/learn/lesson-view';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.lesson };

export default function LessonPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <LessonView />
    </Suspense>
  );
}
