'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '@/i18n/messages';
import { jobsFetch, useForgetJobSeeker, useJobSeeker } from '@/lib/job-seeker';

/** Right side of the job board's header: "Hyr", or the job seeker's saved jobs and sign-out. */
export function JobSeekerNav() {
  const me = useJobSeeker();
  const forget = useForgetJobSeeker();

  if (me.isPending) return <div className="h-11 w-16" aria-hidden />;
  if (!me.data) {
    return (
      <Button asChild variant="chunky" className="h-11 px-5">
        <Link href="/hyr">{t.jobs.signIn}</Link>
      </Button>
    );
  }

  async function signOut() {
    await jobsFetch('/job-seekers/auth/logout', { method: 'POST' }).catch(() => undefined);
    forget();
  }

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" className="hidden h-11 sm:inline-flex">
        <Link href="/shpalljet-e-ruajtura">{t.jobs.savedLink}</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-11 max-w-[11rem] gap-1"
            aria-label={t.jobs.accountMenu}
          >
            <span className="truncate">{me.data.email}</span>
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-ink-soft font-normal">
            {me.data.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/shpalljet-e-ruajtura">{t.jobs.savedLink}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void signOut()}>{t.jobs.signOut}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
