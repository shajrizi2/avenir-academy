import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ModuleManager } from '@/components/teach/module-manager';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Manage module' };

export default function ManageModulePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <ModuleManager />
    </Suspense>
  );
}
