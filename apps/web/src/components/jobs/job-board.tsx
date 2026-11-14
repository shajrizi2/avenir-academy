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
import { JobRow } from './job-row';
import { JobSearch } from './job-search';

export interface BoardParams {
  q?: string | string[];
  kategoria?: string | string[];
  faqja?: string | string[];
  preview?: string | string[];
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The job board: real counts, the search bar and type dropdown, the list and "Shfaq më shumë". */
export async function JobBoard({ searchParams }: { searchParams: Promise<BoardParams> }) {
  const params = await searchParams;
  const q = (first(params.q) ?? '').trim().slice(0, 100);
  const category: JobCategory | null = jobCategoryFromSlug(first(params.kategoria));
  const pages = Math.min(Math.max(Number(first(params.faqja)) || 1, 1), 20);
  const preview = params.preview !== undefined;

  let data: JobBoardPage;
  try {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
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
    ...(preview ? { preview: '' } : {}),
    ...(q ? { q } : {}),
    ...(category ? { kategoria: JOB_CATEGORY_SLUGS[category] } : {}),
    faqja: String(pages + 1),
  }).toString()}`;

  return (
    <>
      <div className="space-y-5 text-center">
        <p className="text-ink-soft text-base">
          {fmt(t.jobs.counts, { new: data.newToday, total: data.totalOpen })}
        </p>
        <JobSearch q={q} category={category} categories={data.categories} preview={preview} />
        {q && (
          <p className="text-ink text-base font-semibold" role="status">
            {fmt(t.jobs.search.results, { count: data.total, q })}{' '}
            <Link
              href={preview ? '/?preview' : '/'}
              className="text-ink-soft font-normal underline underline-offset-4"
            >
              {t.jobs.search.clear}
            </Link>
          </p>
        )}
      </div>
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
      <div className="bg-soft mx-auto h-5 w-64" />
      <div className="bg-soft mx-auto h-12 w-full max-w-3xl" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="border-line space-y-2 border-b py-5">
          <div className="bg-soft h-5 w-2/3" />
          <div className="bg-soft h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
