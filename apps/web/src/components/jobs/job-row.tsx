import type { PublicJob } from '@ai-academy/shared';
import { fmt, t } from '@/i18n/messages';
import { FEED_NAMES, jobTags } from '@/lib/job-format';
import { JobActions } from './job-actions';
import { PostedAgo } from './posted-ago';

/** One job: the title, then company · category · posted, then up to three tags. */
export function JobRow({ job }: { job: PublicJob }) {
  return (
    <li className="border-line flex flex-col gap-3 border-b py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-1.5">
        <h2 className="text-ink text-lg leading-snug font-bold">{job.title}</h2>
        <p className="text-ink-soft text-base">
          <span className="text-ink font-semibold">{job.company}</span>
          <span aria-hidden> · </span>
          {t.jobs.categories[job.category]}
          <span aria-hidden> · </span>
          <PostedAgo value={job.postedAt} />
          {!job.open && (
            <>
              <span aria-hidden> · </span>
              <span className="text-ink font-semibold">{t.jobs.closed}</span>
            </>
          )}
        </p>
        <p className="text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {jobTags(job).map((tag) => (
            <span key={tag} className="bg-soft text-ink rounded-full px-2.5 py-0.5 font-medium">
              {tag}
            </span>
          ))}
          {job.credit && (
            <a href={job.credit.url} className="hover:text-ink underline-offset-4 hover:underline">
              {fmt(t.jobs.source, { source: FEED_NAMES[job.credit.source] })}
            </a>
          )}
        </p>
      </div>
      <JobActions job={job} />
    </li>
  );
}
