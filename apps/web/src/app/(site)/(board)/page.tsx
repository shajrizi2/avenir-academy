import type { Metadata } from 'next';
import { Suspense } from 'react';
import { type BoardParams, JobBoard, JobBoardSkeleton } from '@/components/jobs/job-board';
import { SignInGate } from '@/components/jobs/sign-in-gate';
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

/** The home page: remote jobs people in Kosovo can apply for (PLAN D36, D37). */
export default function JobBoardPage({ searchParams }: { searchParams: Promise<BoardParams> }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="text-heading md:text-title tracking-heading text-ink mx-auto max-w-3xl text-center font-extrabold">
        {t.jobs.title}
      </h1>
      <Suspense fallback={<JobBoardSkeleton />}>
        <JobBoard searchParams={searchParams} />
      </Suspense>
      <SignInGate />
    </div>
  );
}
