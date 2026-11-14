import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AttendanceEditor } from '@/components/teach/attendance-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.attendance };

export default function AttendancePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-none" />}>
      <AttendanceEditor />
    </Suspense>
  );
}
