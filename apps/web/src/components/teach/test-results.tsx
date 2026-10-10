'use client';

import type { ProgressRecord, TestResultRow } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, RotateCcw, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { PageHeader } from '@/components/page-header';
import { TestWindow } from '@/components/tests/test-window';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { testBuilderQuery, testResultsQuery } from '@/lib/queries';

/** /teach/modules/[id]/results: how every enrolled student did, with admin overrides. */
export function TestResultsView() {
  const { id: moduleId } = useParams<{ id: string }>();
  const builder = useQuery(testBuilderQuery(moduleId));
  const testId = builder.data?.test?.id;
  const results = useQuery({ ...testResultsQuery(testId ?? ''), enabled: Boolean(testId) });

  const back = (
    <Link
      href={`/teach/modules/${moduleId}`}
      className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> Back to the module
    </Link>
  );

  if (builder.isPending || (testId && results.isPending)) {
    return <Skeleton className="rounded-card h-96 w-full" />;
  }
  if (builder.error) return <FormError message={errorMessage(builder.error)} />;
  if (!testId) {
    return (
      <>
        {back}
        <EmptyState
          icon={ClipboardList}
          title="This module has no test yet"
          description="Create the test first; results appear here once students take it."
          action={
            <Button asChild variant="chunky">
              <Link href={`/teach/modules/${moduleId}/test`}>Create the test</Link>
            </Button>
          }
        />
      </>
    );
  }
  if (results.error) return <FormError message={errorMessage(results.error)} />;
  if (!results.data) return null;

  const { test, rows } = results.data;
  const passed = rows.filter((r) => r.status === 'PASSED').length;
  const failed = rows.filter((r) => r.status === 'FAILED').length;

  return (
    <>
      {back}
      <PageHeader
        title={`Results: ${test.title}`}
        description={`${test.module.course.title} · Module ${test.module.order}: ${test.module.title}`}
      />
      <p className="text-ink-soft -mt-4 text-sm">
        Pass mark {test.passMark}% · {test.maxAttempts} attempt{test.maxAttempts === 1 ? '' : 's'} ·
        open <TestWindow test={test} />
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No enrolled students yet"
          description="Students appear here once an admin approves their enrollment in this course."
        />
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:gap-4">
            <Stat label="Students" value={rows.length} />
            <Stat label="Passed" value={passed} />
            <Stat label="Out of attempts" value={failed} />
          </ul>
          <ul className="border-line rounded-card bg-background divide-line divide-y border">
            {rows.map((row) => (
              <ResultRow key={row.user.id} row={row} testId={test.id} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li className="border-line rounded-card bg-background border p-3 sm:p-5">
      <p className="text-ink-soft text-xs font-semibold sm:text-sm">{label}</p>
      <p className="text-ink text-subheading sm:text-heading font-extrabold">{value}</p>
    </li>
  );
}

function ResultRow({ row, testId }: { row: TestResultRow; testId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const last = row.lastAttempt;
  const name = `${row.user.firstName} ${row.user.lastName}`;

  async function override(status: 'ACTIVE' | 'PASSED') {
    try {
      await apiFetch<ProgressRecord>(`/progress/${row.progressId}`, {
        method: 'PATCH',
        body: { status },
      });
      toast.success(
        status === 'PASSED' ? `${name} passed the module` : `${name} can take the test again`,
      );
      await queryClient.invalidateQueries({ queryKey: ['tests', testId, 'results'] });
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-ink font-bold">{name}</p>
        <p className="text-ink-soft truncate text-sm">{row.user.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <ModuleStatusBadge status={row.status} />
        <span className="text-ink">
          <span className="text-ink-soft">Best </span>
          <strong>{row.bestScore === null ? '–' : `${row.bestScore}%`}</strong>
        </span>
        <span className="text-ink">
          <span className="text-ink-soft">Attempts </span>
          <strong>{row.attemptsUsed}</strong>
          {row.status === 'ACTIVE' && (
            <span className="text-ink-soft"> · {row.attemptsLeft} left</span>
          )}
        </span>
        <span className="text-ink-soft">
          {last ? (
            last.status === 'IN_PROGRESS' ? (
              <span className="text-active-ink font-semibold">Taking it now</span>
            ) : (
              <>
                Last{' '}
                <LocalDateTime
                  value={last.submittedAt ?? last.startedAt}
                  options={{ dateStyle: 'medium' }}
                />
                {last.status === 'EXPIRED' && ' (time ran out)'}
              </>
            )
          ) : (
            'Not taken'
          )}
        </span>
      </div>
      {isAdmin && row.progressId && row.status !== 'PASSED' && (
        <div className="flex flex-wrap gap-2">
          {row.status !== 'ACTIVE' && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <RotateCcw data-icon="inline-start" />
                  {row.status === 'FAILED' ? 'Give another try' : 'Unlock'}
                </Button>
              }
              title={row.status === 'FAILED' ? 'Give another try?' : 'Unlock this module?'}
              description={`${name} gets a fresh set of ${row.status === 'FAILED' ? 'attempts' : 'attempts and access to the module'}. Earlier attempts stay on record.`}
              confirmLabel={row.status === 'FAILED' ? 'Reset attempts' : 'Unlock module'}
              confirmVariant="chunky"
              onConfirm={() => override('ACTIVE')}
            />
          )}
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm">
                <Trophy data-icon="inline-start" /> Mark passed
              </Button>
            }
            title="Mark this module as passed?"
            description={`${name} passes without the test, and the next module opens for them.`}
            confirmLabel="Mark passed"
            confirmVariant="chunky"
            onConfirm={() => override('PASSED')}
          />
        </div>
      )}
    </li>
  );
}
