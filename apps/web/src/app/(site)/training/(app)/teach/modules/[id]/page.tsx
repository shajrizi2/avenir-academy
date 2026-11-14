import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ModuleManager } from '@/components/teach/module-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.manageModule };

export default function ManageModulePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <ModuleManager />
    </Suspense>
  );
}
