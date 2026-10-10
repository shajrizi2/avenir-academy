import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TestResultsView } from '@/components/teach/test-results';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Test results' };

export default function TestResultsPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <TestResultsView />
    </Suspense>
  );
}
