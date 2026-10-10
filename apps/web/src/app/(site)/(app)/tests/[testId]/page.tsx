import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TestPage } from '@/components/tests/test-page';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Module test' };

export default function StudentTestPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <TestPage />
    </Suspense>
  );
}
