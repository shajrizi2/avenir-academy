import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/dashboard-view';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <DashboardView />;
}
