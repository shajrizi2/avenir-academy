'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { jobsFetch, useForgetJobSeeker, useJobSeeker, useSavedJobs } from '@/lib/job-seeker';
import { JobRow } from './job-row';

const copy = t.jobs.savedPage;

/** The job seeker's saved jobs, plus sign out everywhere and delete the account. */
export function SavedJobs() {
  const me = useJobSeeker();
  const saved = useSavedJobs(Boolean(me.data));
  const forget = useForgetJobSeeker();

  if (me.isPending) return null;
  if (!me.data) {
    return (
      <Button asChild variant="chunky" size="lg">
        <Link href="/hyr?next=%2Fshpalljet-e-ruajtura">{t.jobs.signIn}</Link>
      </Button>
    );
  }

  async function everywhere() {
    try {
      await jobsFetch('/job-seekers/auth/logout-everywhere', { method: 'POST' });
      forget();
      toast.success(copy.signedOutEverywhere);
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  async function remove() {
    try {
      await jobsFetch('/job-seekers/me', { method: 'DELETE' });
      forget();
      toast.success(copy.deleted);
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  const jobs = saved.data ?? [];
  return (
    <div className="space-y-10">
      {saved.isPending ? null : jobs.length === 0 ? (
        <div className="space-y-4">
          <p className="text-ink-soft">{copy.empty}</p>
          <Button asChild variant="chunky-outline">
            <Link href="/">{copy.browse}</Link>
          </Button>
        </div>
      ) : (
        <ul aria-label={copy.title} className="border-line border-t">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </ul>
      )}
      <section className="border-line space-y-4 border-t pt-8">
        <p className="text-ink-soft">{fmt(copy.signedInAs, { email: me.data.email })}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="chunky-outline" onClick={() => void everywhere().catch(() => undefined)}>
            {copy.signOutEverywhere}
          </Button>
          <ConfirmDialog
            trigger={<Button variant="destructive">{copy.deleteAccount}</Button>}
            title={copy.deleteTitle}
            description={copy.deleteDescription}
            confirmLabel={copy.deleteAccount}
            onConfirm={remove}
          />
        </div>
      </section>
    </div>
  );
}
