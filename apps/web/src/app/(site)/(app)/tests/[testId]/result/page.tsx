import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TestResult } from '@/components/tests/test-result';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Test result' };

export default function TestResultPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <TestResult />
    </Suspense>
  );
}
