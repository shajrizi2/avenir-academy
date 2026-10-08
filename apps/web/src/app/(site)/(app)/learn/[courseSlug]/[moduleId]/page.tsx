import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnModule } from '@/components/learn/learn-module';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Module' };

export default function LearnModulePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <LearnModule />
    </Suspense>
  );
}
