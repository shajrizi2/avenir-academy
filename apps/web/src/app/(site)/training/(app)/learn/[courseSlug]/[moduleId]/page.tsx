import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnModule } from '@/components/learn/learn-module';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.module };

export default function LearnModulePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <LearnModule />
    </Suspense>
  );
}
