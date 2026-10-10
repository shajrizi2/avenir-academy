import type { Metadata } from 'next';
import { TestimonialList } from '@/components/admin/landing/testimonial-list';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Testimonials' };

export default function AdminTestimonialListPage() {
  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Real, published quotes from students. The landing page shows each one in its own language and hides the section when there are none."
      />
      <TestimonialList />
    </>
  );
}
