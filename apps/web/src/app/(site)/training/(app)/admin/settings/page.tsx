import type { Metadata } from 'next';
import { SiteSettingsForm } from '@/components/admin/landing/site-settings-form';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.settings };

export default function AdminSiteSettingsFormPage() {
  return (
    <>
      <PageHeader title={t.admin.settings.title} description={t.admin.settings.description} />
      <SiteSettingsForm />
    </>
  );
}
