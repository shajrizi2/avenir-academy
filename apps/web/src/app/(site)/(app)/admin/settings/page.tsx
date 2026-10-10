import type { Metadata } from 'next';
import { SiteSettingsForm } from '@/components/admin/landing/site-settings-form';
import { PageHeader } from '@/components/page-header';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Site settings' };

export default function AdminSiteSettingsFormPage() {
  return (
    <>
      <PageHeader
        title="Site settings"
        description="Cohort date, schedule, seats, price and contact details on the landing page. Changes show without a deploy."
      />
      <SiteSettingsForm />
    </>
  );
}
