import type { PublicJob } from '@ai-academy/shared';
import { fmt, t } from '@/i18n/messages';
import { jobDetails, salaryLabel } from '@/lib/job-format';
import { JobActions } from './job-actions';
import { PostedAgo } from './posted-ago';

/**
 * One job as a row (white and light grey in turn): the title, the company and when it was
 * posted, a sentence about the job, then the pay. The whole row opens the job, and so does
 * "Apliko" (PLAN D38).
 */
export function JobRow({ job }: { job: PublicJob }) {
  const salary = salaryLabel(job);
  const details = jobDetails(job);
  return (
    <li className="odd:bg-background even:bg-soft hover:bg-line relative transition-colors">
      <div className="flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
        <div className="min-w-0 space-y-2">
          <h2 className="text-ink text-lg leading-snug font-bold">
            {job.open ? (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener"
                aria-label={fmt(t.jobs.openLabel, { title: job.title, company: job.company })}
                className="underline-offset-4 before:absolute before:inset-0 before:content-[''] hover:underline focus-visible:underline"
              >
                {job.title}
              </a>
            ) : (
              job.title
            )}
          </h2>
          <p className="text-ink-soft text-base">
            <span className="text-ink font-semibold">{job.company}</span>
            <span aria-hidden> · </span>
            <PostedAgo value={job.postedAt} />
            {!job.open && (
              <>
                <span aria-hidden> · </span>
                <span className="text-ink font-semibold">{t.jobs.closed}</span>
              </>
            )}
          </p>
          {job.summary && <p className="text-ink-soft line-clamp-2 max-w-3xl">{job.summary}</p>}
          <p className="text-ink-soft text-sm">
            {salary && <span className="text-ink font-semibold">{salary}</span>}
            {details.map((detail, i) => (
              <span key={detail}>
                {(salary || i > 0) && <span aria-hidden> · </span>}
                {detail}
              </span>
            ))}
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <JobActions job={job} />
        </div>
      </div>
    </li>
  );
}
