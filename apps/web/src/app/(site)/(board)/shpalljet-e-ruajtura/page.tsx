import type { Metadata } from 'next';
import { SavedJobs } from '@/components/jobs/saved-jobs';
import { t } from '@/i18n/messages';

const copy = t.jobs.savedPage;

export const metadata: Metadata = {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
};

export default function SavedJobsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:py-14">
      <header className="space-y-2">
        <h1 className="text-heading tracking-heading text-ink font-extrabold">{copy.title}</h1>
        <p className="text-ink-soft max-w-2xl">{copy.lead}</p>
      </header>
      <SavedJobs />
    </div>
  );
}
