import type { Metadata } from 'next';
import { SubscriberList } from '@/components/admin/campaigns/subscriber-list';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.subscribers };

export default function AdminSubscribersPage() {
  return <SubscriberList />;
}
