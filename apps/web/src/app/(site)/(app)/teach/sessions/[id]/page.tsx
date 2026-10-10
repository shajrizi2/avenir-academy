import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AttendanceEditor } from '@/components/teach/attendance-editor';
import { Skeleton } from '@/components/ui/skeleton';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Attendance' };

export default function AttendancePage() {
  return (
    <Suspense fallback={<Skeleton className="rounded-card h-96 w-full" />}>
      <AttendanceEditor />
    </Suspense>
  );
}
