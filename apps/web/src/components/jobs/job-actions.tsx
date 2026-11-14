'use client';

import type { PublicJob } from '@ai-academy/shared';
import { Bookmark, BookmarkCheck, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { useJobSeeker, useSavedIds, useToggleSave } from '@/lib/job-seeker';
import { ReportDialog } from './report-dialog';

/** Sends a signed-out visitor to sign in, then back to this page. */
function goSignIn() {
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/hyr?next=${encodeURIComponent(next)}`);
}

/** "Apliko", "Ruaj" and the "···" menu with "Raporto", on one job. */
export function JobActions({ job }: { job: PublicJob }) {
  const me = useJobSeeker();
  const signedIn = Boolean(me.data);
  const saved = useSavedIds(signedIn);
  const toggle = useToggleSave();
  const [reporting, setReporting] = useState(false);
  const isSaved = Boolean(saved.data?.includes(job.id));

  function onSave() {
    if (!signedIn) {
      toast(t.jobs.signInToSave);
      goSignIn();
      return;
    }
    toggle.mutate(
      { jobId: job.id, save: !isSaved },
      { onError: (error) => toast.error(errorMessage(error)) },
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {job.open && (
        <Button asChild variant="chunky" size="sm" className="h-11 px-4 text-sm">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener"
            aria-label={fmt(t.jobs.applyLabel, { title: job.title, company: job.company })}
          >
            {t.jobs.apply}
          </a>
        </Button>
      )}
      <Button
        variant="ghost"
        className="h-11 gap-1.5 px-3"
        onClick={onSave}
        aria-pressed={isSaved}
        aria-label={fmt(isSaved ? t.jobs.unsaveLabel : t.jobs.saveLabel, { title: job.title })}
      >
        {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
        <span className="hidden sm:inline">{isSaved ? t.jobs.saved : t.jobs.save}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={fmt(t.jobs.moreLabel, { title: job.title })}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => (signedIn ? setReporting(true) : goSignIn())}>
            {t.jobs.report}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog jobId={job.id} open={reporting} onOpenChange={setReporting} />
    </div>
  );
}
