import type { Metadata } from 'next';
import { CampaignList } from '@/components/admin/campaigns/campaign-list';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.campaigns };

export default function AdminCampaignsPage() {
  return <CampaignList />;
}
