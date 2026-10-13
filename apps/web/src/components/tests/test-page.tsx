'use client';

import type { AttemptSession, StudentTest } from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Award, Clock, ListChecks, Play, RotateCcw, Target } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { attemptQuery, studentTestQuery } from '@/lib/queries';
import { AttemptHistory } from './attempt-history';
import { AttemptRunner } from './attempt-runner';
import { TEST_TIME_FORMAT, TestWindow, useWindowState } from './test-window';

/** /tests/[testId]: the rules and the Start button, then the attempt itself. */
export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const queryClient = useQueryClient();
  const { data: test, isPending, error } = useQuery(studentTestQuery(testId));
  const [runningId, setRunningId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => apiFetch<AttemptSession>(`/tests/${testId}/attempts`, { method: 'POST' }),
    onSuccess: (session) => {
      queryClient.setQueryData(attemptQuery(session.id).queryKey, session);
      setRunningId(session.id);
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      void queryClient.invalidateQueries({ queryKey: studentTestQuery(testId).queryKey });
    },
  });

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) {
    return (
      <div className="space-y-4">
        <FormError message={errorMessage(error)} />
        <Link href="/dashboard" className="text-ink font-semibold underline underline-offset-4">
          {t.tests.page.backToDashboard}
        </Link>
      </div>
    );
  }

  if (runningId) {
    return (
      <AttemptRunner
        attemptId={runningId}
        testId={testId}
        // Next keeps this page alive (hidden) after navigating away, so forget the attempt
        // once it is handed in; otherwise "Try again" would reopen the finished one.
        onFinished={() => setRunningId(null)}
      />
    );
  }

  return (
    <Overview
      test={test}
      // Resuming opens the saved attempt itself, so a just-expired one shows its result
      // instead of quietly starting a new attempt.
      onStart={() => (test.activeAttemptId ? setRunningId(test.activeAttemptId) : start.mutate())}
      starting={start.isPending}
    />
  );
}

function Overview({
  test,
  onStart,
  starting,
}: {
  test: StudentTest;
  onStart: () => void;
  starting: boolean;
}) {
  const state = useWindowState(test);
  const finished = test.attempts.filter((a) => a.status !== 'IN_PROGRESS');
  const moduleHref = `/learn/${test.module.course.slug}/${test.module.id}`;

  return (
    <>
      <Link
        href={moduleHref}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />{' '}
        {fmt(t.tests.page.moduleLink, { number: test.module.order, title: test.module.title })}
      </Link>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-ink-soft text-sm font-bold">{test.module.course.title}</p>
          <ModuleStatusBadge status={test.status} />
        </div>
        <h1 className="text-ink text-heading font-extrabold">{test.title}</h1>
        <p className="text-ink-soft">
          {t.tests.page.open} <TestWindow test={test} />
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Rule icon={ListChecks} label={t.tests.page.questions} value={`${test.questionCount}`} />
        <Rule
          icon={Clock}
          label={t.tests.page.timeLimit}
          value={fmt(t.tests.page.minutes, { count: test.timeLimitMin })}
        />
        <Rule icon={Target} label={t.tests.page.toPass} value={`${test.passMark}%`} />
        <Rule
          icon={RotateCcw}
          label={t.tests.page.attemptsLeft}
          value={fmt(t.tests.page.attemptsOf, { left: test.attemptsLeft, max: test.maxAttempts })}
        />
      </ul>

      <section
        aria-labelledby="start-title"
        className="border-ink rounded-card bg-background space-y-4 border-2 p-6 sm:p-8"
      >
        <h2 id="start-title" className="text-ink text-subheading font-extrabold">
          {test.activeAttemptId ? t.tests.page.inProgressTitle : t.tests.page.beforeStart}
        </h2>
        <StartArea test={test} state={state} onStart={onStart} starting={starting} />
      </section>

      {finished.length > 0 && (
        <section aria-labelledby="history-title" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="history-title" className="text-ink text-subheading font-extrabold">
              {t.tests.page.yourAttempts}
            </h2>
            <Link
              href={`/tests/${test.id}/result`}
              className="text-ink text-sm font-semibold underline underline-offset-4"
            >
              {t.tests.page.latestResult}
            </Link>
          </div>
          <AttemptHistory attempts={finished} passMark={test.passMark} />
        </section>
      )}
    </>
  );
}

function StartArea({
  test,
  state,
  onStart,
  starting,
}: {
  test: StudentTest;
  state: ReturnType<typeof useWindowState>;
  onStart: () => void;
  starting: boolean;
}) {
  if (test.activeAttemptId) {
    return (
      <>
        <p className="text-ink">{t.tests.page.resumeText}</p>
        <Button variant="chunky" size="lg" onClick={onStart} disabled={starting}>
          <Play data-icon="inline-start" /> {starting ? t.tests.page.opening : t.tests.page.resume}
        </Button>
      </>
    );
  }
  if (test.status === 'PASSED') {
    return (
      <>
        <p className="text-ink flex items-center gap-2 font-semibold">
          <Award className="text-passed-ink size-5" aria-hidden /> {t.tests.page.passedModule}
        </p>
        {test.nextModule && (
          <Button asChild variant="chunky" size="lg">
            <Link href={`/learn/${test.nextModule.course.slug}/${test.nextModule.id}`}>
              {fmt(t.tests.page.goToModule, {
                number: test.nextModule.order,
                title: test.nextModule.title,
              })}
            </Link>
          </Button>
        )}
      </>
    );
  }
  if (test.status === 'FAILED' || test.attemptsLeft === 0) {
    return <p className="text-ink">{t.tests.page.noAttemptsLeft}</p>;
  }
  if (state === 'upcoming') {
    return (
      <p className="text-ink">
        {fmt(t.tests.page.opensOn, { date: formatDate(test.opensAt, TEST_TIME_FORMAT) })}
      </p>
    );
  }
  if (state === 'closed') {
    return <p className="text-ink">{t.tests.page.closed}</p>;
  }

  return (
    <>
      <ul className="text-ink list-disc space-y-1 pl-5">
        <li>{fmt(t.tests.page.rule1, { count: test.timeLimitMin })}</li>
        <li>{t.tests.page.rule2}</li>
        <li>{t.tests.page.rule3}</li>
        <li>{t.tests.page.rule4}</li>
      </ul>
      <Button variant="chunky" size="lg" onClick={onStart} disabled={starting || state !== 'open'}>
        <Play data-icon="inline-start" />
        {starting
          ? t.tests.page.starting
          : test.attempts.length > 0
            ? t.tests.page.tryAgain
            : t.tests.page.start}
      </Button>
    </>
  );
}

function Rule({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <li className="border-line rounded-card bg-background flex items-center gap-4 border p-5">
      <span className="bg-soft text-ink flex size-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-ink-soft text-sm font-semibold">{label}</p>
        <p className="text-ink text-lg font-extrabold">{value}</p>
      </div>
    </li>
  );
}
