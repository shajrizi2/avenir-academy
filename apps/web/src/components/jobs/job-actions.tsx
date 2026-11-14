import type { PublicJob } from '@ai-academy/shared';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';

/** The one action on a job: "Apliko" opens the company's own page in a new tab. */
export function JobActions({ job }: { job: PublicJob }) {
  if (!job.open) return null;
  return (
    <Button asChild variant="chunky" size="sm" className="h-11 shrink-0 px-5 text-sm">
      <a
        href={job.applyUrl}
        target="_blank"
        rel="noopener"
        aria-label={fmt(t.jobs.applyLabel, { title: job.title, company: job.company })}
      >
        {t.jobs.apply}
      </a>
    </Button>
  );
}
