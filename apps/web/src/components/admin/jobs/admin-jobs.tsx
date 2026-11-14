'use client';

import {
  type AddJobBlockInput,
  type AddJobCompanyInput,
  type AdminHiddenJob,
  type AdminJobBlock,
  type AdminJobCompany,
  type AdminJobsOverview,
  addJobBlockSchema,
  addJobCompanySchema,
  formatSqDate,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormError } from '@/components/form-error';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { LocalDateTime } from '@/components/local-date-time';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { useNow } from '@/lib/use-now';

const a = t.adminJobs;
const keys = {
  overview: ['admin-jobs', 'overview'] as const,
  companies: ['admin-jobs', 'companies'] as const,
  hidden: ['admin-jobs', 'hidden'] as const,
  blocks: ['admin-jobs', 'blocks'] as const,
};

/** The job board's admin page (PLAN D36): run log, sources, companies, hidden jobs, blocks. */
export function AdminJobs() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });

  async function act(run: () => Promise<{ message?: string } | void>) {
    try {
      const result = await run();
      toast.success(result && 'message' in result && result.message ? result.message : a.saved);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <PageHeader
        title={a.title}
        description={a.description}
        actions={
          <Button
            variant="chunky"
            onClick={() => void act(() => apiFetch('/admin/jobs/run', { method: 'POST' }))}
          >
            {a.runNow}
          </Button>
        }
      />
      <Overview />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Companies act={act} />
        <div className="space-y-6">
          <Hidden act={act} />
          <Blocks act={act} />
        </div>
      </div>
    </>
  );
}

type Act = (run: () => Promise<{ message?: string } | void>) => Promise<void>;

function Overview() {
  const now = useNow();
  const { data, isPending, error } = useQuery({
    queryKey: keys.overview,
    queryFn: () => apiFetch<AdminJobsOverview>('/admin/jobs/overview'),
  });
  if (isPending) return <Skeleton className="h-48 w-full rounded-none" />;
  if (error) return <FormError message={errorMessage(error)} />;
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['open', 'rejected', 'hidden', 'closed'] as const).map((k) => (
          <div key={k} className="border-line bg-background rounded-none border p-4">
            <dt className="text-ink-soft text-sm">{a.counts[k]}</dt>
            <dd className="text-ink text-heading font-extrabold">{data.counts[k]}</dd>
          </div>
        ))}
      </dl>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{a.feeds}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.feeds.map((feed) => (
              <li key={feed.kind} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-ink font-semibold">{feed.kind}</span>
                <span className="text-ink-soft text-sm">
                  {feed.pausedUntil && Date.parse(feed.pausedUntil) > now
                    ? fmt(a.feedPaused, { date: formatSqDate(feed.pausedUntil) })
                    : feed.failCount > 0
                      ? fmt(a.feedFailing, { count: feed.failCount })
                      : a.feedOk}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{a.runs}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.runs.length === 0 ? (
            <p className="text-ink-soft">{a.runsEmpty}</p>
          ) : (
            <ul className="divide-line divide-y">
              {data.runs.map((run) => {
                const s = run.stats ?? {};
                const failed = (s.sources ?? []).filter((x) => !x.ok).map((x) => x.name);
                const closed = Object.entries(s.closed ?? {})
                  .map(([reason, n]) => `${reason} ${n}`)
                  .join(', ');
                return (
                  <li key={run.id} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <LocalDateTime value={run.startedAt} className="text-ink font-semibold" />
                      <Badge variant={run.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {a.runStatus[run.status]}
                      </Badge>
                    </div>
                    <p className="text-ink-soft text-sm">
                      {fmt(a.runLine, {
                        seen: s.seen ?? 0,
                        created: s.created ?? 0,
                        published: s.published ?? 0,
                        discovered: s.discovered ?? 0,
                        links: s.linkChecks ?? 0,
                      })}
                    </p>
                    {closed && (
                      <p className="text-ink-soft text-sm">{fmt(a.closedLine, { closed })}</p>
                    )}
                    {failed.length > 0 && (
                      <p className="text-ink text-sm">
                        {fmt(a.sourcesFailed, { sources: failed.join(', ') })}
                      </p>
                    )}
                    {run.errors?.map((e) => (
                      <p key={e} className="text-ink text-sm">
                        {e}
                      </p>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Companies({ act }: { act: Act }) {
  const { data, isPending } = useQuery({
    queryKey: keys.companies,
    queryFn: () => apiFetch<AdminJobCompany[]>('/admin/jobs/companies'),
  });
  const form = useForm<AddJobCompanyInput>({
    resolver: zodResolver(addJobCompanySchema),
    defaultValues: { name: '', careersUrl: '' },
  });
  const add = form.handleSubmit((values) =>
    act(async () => {
      const result = await apiFetch<{ message: string }>('/admin/jobs/companies', {
        method: 'POST',
        body: values,
      });
      form.reset();
      return result;
    }),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{a.companies}</CardTitle>
        <CardDescription>{a.companiesHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={(e) => void add(e)} noValidate>
          <FieldGroup>
            <TextField form={form} name="name" label={a.companyName} />
            <TextField
              form={form}
              name="careersUrl"
              label={a.careersUrl}
              type="url"
              placeholder="https://jobs.lever.co/…"
            />
            <Button type="submit" variant="chunky-outline" disabled={form.formState.isSubmitting}>
              {a.addCompany}
            </Button>
          </FieldGroup>
        </form>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : !data?.length ? (
          <p className="text-ink-soft">{a.companiesEmpty}</p>
        ) : (
          <ul className="divide-line divide-y">
            {data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-ink font-semibold">{c.name}</p>
                  <p className="text-ink-soft text-sm">
                    {c.ats} · {c.boardToken} · {fmt(a.openJobs, { count: c.openJobs })} ·{' '}
                    {a.companyStatus[c.status]}
                  </p>
                </div>
                {c.status !== 'BLOCKED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void act(() =>
                        apiFetch(`/admin/jobs/companies/${c.id}`, {
                          method: 'PATCH',
                          body: { status: c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
                        }),
                      )
                    }
                  >
                    {c.status === 'ACTIVE' ? a.disable : a.enable}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Hidden({ act }: { act: Act }) {
  const { data, isPending } = useQuery({
    queryKey: keys.hidden,
    queryFn: () => apiFetch<AdminHiddenJob[]>('/admin/jobs/hidden'),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{a.hidden}</CardTitle>
        <CardDescription>{a.hiddenHint}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : !data?.length ? (
          <p className="text-ink-soft">{a.hiddenEmpty}</p>
        ) : (
          <ul className="divide-line divide-y">
            {data.map((job) => (
              <li key={job.id} className="space-y-2 py-3">
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink font-semibold underline-offset-4 hover:underline"
                >
                  {job.title} · {job.company}
                </a>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void act(() =>
                        apiFetch(`/admin/jobs/${job.id}`, {
                          method: 'PATCH',
                          body: { status: 'OPEN' },
                        }),
                      )
                    }
                  >
                    {a.restore}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void act(() =>
                        apiFetch(`/admin/jobs/${job.id}`, {
                          method: 'PATCH',
                          body: { status: 'CLOSED' },
                        }),
                      )
                    }
                  >
                    {a.close}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Blocks({ act }: { act: Act }) {
  const { data, isPending } = useQuery({
    queryKey: keys.blocks,
    queryFn: () => apiFetch<AdminJobBlock[]>('/admin/jobs/blocks'),
  });
  const form = useForm<AddJobBlockInput>({
    resolver: zodResolver(addJobBlockSchema),
    defaultValues: { kind: 'DOMAIN', value: '', reason: '' },
  });
  const add = form.handleSubmit((values) =>
    act(async () => {
      const result = await apiFetch<{ message: string }>('/admin/jobs/blocks', {
        method: 'POST',
        body: values,
      });
      form.reset();
      return result;
    }),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{a.blocks}</CardTitle>
        <CardDescription>{a.blocksHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={(e) => void add(e)} noValidate>
          <FieldGroup>
            <SelectField
              form={form}
              name="kind"
              label={a.blockKind}
              options={[
                { value: 'DOMAIN', label: a.blockKinds.DOMAIN },
                { value: 'COMPANY', label: a.blockKinds.COMPANY },
              ]}
            />
            <TextField form={form} name="value" label={a.blockValue} />
            <TextField form={form} name="reason" label={a.blockReason} />
            <Button type="submit" variant="chunky-outline" disabled={form.formState.isSubmitting}>
              {a.addBlock}
            </Button>
          </FieldGroup>
        </form>
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !data?.length ? (
          <p className="text-ink-soft">{a.blocksEmpty}</p>
        ) : (
          <ul className="divide-line divide-y">
            {data.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-ink font-semibold">{b.value}</p>
                  <p className="text-ink-soft text-sm">
                    {a.blockKinds[b.kind]} · {b.reason}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void act(() => apiFetch(`/admin/jobs/blocks/${b.id}`, { method: 'DELETE' }))
                  }
                >
                  {a.unblock}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
