import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { type BoardParams, JobBoard, JobBoardSkeleton } from '@/components/jobs/job-board';
import { t } from '@/i18n/messages';

export const metadata: Metadata = {
  title: { absolute: `${t.jobs.metaTitle} · Avenir` },
  description: t.jobs.metaDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: t.jobs.metaTitle,
    description: t.jobs.metaDescription,
    url: '/',
  },
};

/** The home page: remote jobs people in Kosovo can apply for (PLAN D36). */
export default function JobBoardPage({ searchParams }: { searchParams: Promise<BoardParams> }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="text-heading md:text-title tracking-heading text-ink max-w-3xl font-extrabold">
        {t.jobs.title}
      </h1>
      <Suspense fallback={<JobBoardSkeleton />}>
        <JobBoard searchParams={searchParams} />
      </Suspense>
      <aside
        aria-label={t.jobs.creditsLabel}
        className="text-ink-soft max-w-3xl pt-6 text-sm leading-6"
      >
        <p>{t.jobs.notice}</p>
        <p className="mt-2 flex flex-wrap gap-x-4">
          <a href="https://remoteok.com" className="underline underline-offset-4">
            Remote OK
          </a>
          <a href="https://jobicy.com" className="underline underline-offset-4">
            Jobicy
          </a>
          <a href="https://himalayas.app" className="underline underline-offset-4">
            Himalayas
          </a>
          <Link href="/privatesia" className="underline underline-offset-4">
            {t.shell.privacy}
          </Link>
        </p>
      </aside>
    </div>
  );
}
