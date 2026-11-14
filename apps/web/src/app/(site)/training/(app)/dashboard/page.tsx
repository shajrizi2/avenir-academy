import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.dashboard };

export default function DashboardPage() {
  return <DashboardView />;
}
