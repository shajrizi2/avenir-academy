'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormError } from '@/components/form-error';
import { PathUnlock, TestCheck } from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { studentTestQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { AttemptHistory } from './attempt-history';
import { useWindowState } from './test-window';

/** /tests/[testId]/result: the latest graded attempt and what happens next. */
export function TestResult() {
  const { testId } = useParams<{ testId: string }>();
  const { data: test, isPending, error } = useQuery(studentTestQuery(testId));
  const state = useWindowState(test ?? { opensAt: '', closesAt: '' });

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;

  const finished = test.attempts.filter((a) => a.status !== 'IN_PROGRESS');
  const latest = finished[0];
  const moduleHref = `/learn/${test.module.course.slug}/${test.module.id}`;
  const back = (
    <Link
      href={moduleHref}
      className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> Module {test.module.order}: {test.module.title}
    </Link>
  );

  if (!latest) {
    return (
      <>
        {back}
        <p className="text-ink">You haven’t handed in this test yet.</p>
        <Button asChild variant="chunky" className="self-start">
          <Link href={`/tests/${test.id}`}>Go to the test</Link>
        </Button>
      </>
    );
  }

  const passed = latest.passed === true;
  const canRetry = !passed && test.status === 'ACTIVE' && test.attemptsLeft > 0;

  return (
    <>
      {back}
      <section
        aria-labelledby="result-title"
        className={cn(
          'rounded-card grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1fr_16rem]',
          passed ? 'bg-passed-tint' : 'bg-soft border-line border',
        )}
      >
        <div className="space-y-4">
          <p className="text-ink text-sm font-bold">{test.title}</p>
          <h1 id="result-title" className="text-ink text-title font-extrabold">
            {passed ? 'You passed!' : 'Not this time'}
          </h1>
          <p className="text-ink text-lg">
            You scored{' '}
            <strong className="text-heading font-extrabold">{latest.scorePct ?? 0}%</strong>
            {passed ? '.' : `. You need ${test.passMark}% to pass.`}
          </p>
          {latest.status === 'EXPIRED' && (
            <p className="text-ink-soft">Time ran out, so the answers you had saved were graded.</p>
          )}
          <NextStep
            passed={passed}
            canRetry={canRetry}
            retryOpen={state === 'open'}
            attemptsLeft={test.attemptsLeft}
            testId={test.id}
            moduleHref={moduleHref}
            nextModule={test.nextModule}
          />
        </div>
        {passed ? (
          <PathUnlock className="mx-auto w-48 md:w-full" />
        ) : (
          <TestCheck className="mx-auto w-48 md:w-full" />
        )}
      </section>

      <section aria-labelledby="history-title" className="space-y-4">
        <h2 id="history-title" className="text-ink text-subheading font-extrabold">
          Your attempts
        </h2>
        <AttemptHistory attempts={finished} passMark={test.passMark} />
      </section>
    </>
  );
}

function NextStep({
  passed,
  canRetry,
  retryOpen,
  attemptsLeft,
  testId,
  moduleHref,
  nextModule,
}: {
  passed: boolean;
  canRetry: boolean;
  retryOpen: boolean;
  attemptsLeft: number;
  testId: string;
  moduleHref: string;
  nextModule: { id: string; order: number; title: string; course: { slug: string } } | null;
}) {
  if (passed) {
    return nextModule ? (
      <Button asChild variant="chunky" size="lg">
        <Link href={`/learn/${nextModule.course.slug}/${nextModule.id}`}>
          Module {nextModule.order} is open: {nextModule.title}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    ) : (
      <p className="text-ink font-semibold">That was the last module of the course. Well done!</p>
    );
  }
  if (canRetry) {
    return (
      <div className="space-y-3">
        <p className="text-ink">
          You have {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left. Review the materials,
          then try again{retryOpen ? '' : ' while the test is open'}.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="chunky" size="lg">
            <Link href={`/tests/${testId}`}>
              <RotateCcw data-icon="inline-start" /> Try again
            </Link>
          </Button>
          <Button asChild variant="chunky-outline" size="lg">
            <Link href={moduleHref}>Review the materials</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <p className="text-ink">
      You have used all your attempts. Your instructor or an admin can give you another try.
    </p>
  );
}
