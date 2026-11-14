import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TestResultsView } from '@/components/teach/test-results';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.testResults };

export default function TestResultsPage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <TestResultsView />
    </Suspense>
  );
}
