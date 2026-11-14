import {
  JOB_CATEGORY_SLUGS,
  type JobBoardPage,
  type JobCategory,
  jobCategoryFromSlug,
} from '@ai-academy/shared';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';
import { serverGet } from '@/lib/server-api';
import { CategoryNav } from './category-nav';
import { JobRow } from './job-row';

export interface BoardParams {
  kategoria?: string | string[];
  faqja?: string | string[];
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The job board: heading, real counts, category buttons, the list and "Shfaq më shumë". */
export async function JobBoard({ searchParams }: { searchParams: Promise<BoardParams> }) {
  const params = await searchParams;
  const category: JobCategory | null = jobCategoryFromSlug(first(params.kategoria));
  const pages = Math.min(Math.max(Number(first(params.faqja)) || 1, 1), 20);

  let data: JobBoardPage;
  try {
    const query = new URLSearchParams({ page: '1' });
    if (category) query.set('category', category);
    // "Shfaq më shumë" grows the list page by page, so the first `pages` pages are shown together.
    const loaded = await Promise.all(
      Array.from({ length: pages }, (_, i) => {
        query.set('page', String(i + 1));
        return serverGet<JobBoardPage>(`/jobs?${query.toString()}`);
      }),
    );
    data = { ...loaded[0], jobs: loaded.flatMap((p) => p.jobs) };
  } catch (error) {
    unstable_rethrow(error);
    return <p className="text-ink-soft py-16 text-center">{t.jobs.loadError}</p>;
  }

  const hasMore = data.jobs.length < data.total;
  const nextHref = `/?${new URLSearchParams({
    ...(category ? { kategoria: JOB_CATEGORY_SLUGS[category] } : {}),
    faqja: String(pages + 1),
  }).toString()}`;

  return (
    <>
      <p className="text-ink-soft text-base">
        {fmt(t.jobs.counts, { new: data.newToday, total: data.totalOpen })}
      </p>
      <CategoryNav categories={data.categories} totalOpen={data.totalOpen} current={category} />
      <p className="border-line bg-soft text-ink rounded-card border px-4 py-3 text-sm">
        {t.jobs.warning}
      </p>
      {data.jobs.length === 0 ? (
        <p className="text-ink-soft py-16 text-center">{t.jobs.empty}</p>
      ) : (
        <ul aria-label={t.jobs.listLabel} className="border-line border-t">
          {data.jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </ul>
      )}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button asChild variant="chunky-outline" size="lg">
            <Link href={nextHref} scroll={false}>
              {t.jobs.showMore}
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}

export function JobBoardSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="bg-soft h-5 w-64 rounded" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="bg-soft h-11 w-28 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="border-line space-y-2 border-b py-5">
          <div className="bg-soft h-5 w-2/3 rounded" />
          <div className="bg-soft h-4 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}
