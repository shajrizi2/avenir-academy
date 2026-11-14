import type { Metadata } from 'next';
import { TestimonialList } from '@/components/admin/landing/testimonial-list';
import { PageHeader } from '@/components/page-header';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.testimonials };

export default function AdminTestimonialListPage() {
  return (
    <>
      <PageHeader
        title={t.admin.testimonials.title}
        description={t.admin.testimonials.description}
      />
      <TestimonialList />
    </>
  );
}
