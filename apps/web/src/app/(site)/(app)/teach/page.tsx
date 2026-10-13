import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { TeachingModules } from '@/components/teach/teaching-modules';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.teach };

export default function TeachPage() {
  return (
    <>
      <PageHeader title={t.teach.index.title} description={t.teach.index.description} />
      <TeachingModules />
    </>
  );
}
