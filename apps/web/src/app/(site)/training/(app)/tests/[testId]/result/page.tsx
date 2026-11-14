import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TestResult } from '@/components/tests/test-result';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.testResult };

export default function TestResultPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-none" />}>
      <TestResult />
    </Suspense>
  );
}
