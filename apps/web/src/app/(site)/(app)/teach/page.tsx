import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { TeachingModules } from '@/components/teach/teaching-modules';

export const metadata: Metadata = { title: 'My modules' };

export default function TeachPage() {
  return (
    <>
      <PageHeader
        title="Teaching"
        description="Schedule live sessions, take attendance and share materials for your modules."
      />
      <TeachingModules />
    </>
  );
}
