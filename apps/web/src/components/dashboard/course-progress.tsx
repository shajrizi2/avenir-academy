'use client';

import type { CourseProgress } from '@ai-academy/shared';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/components/local-date-time';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { TEST_TIME_FORMAT, useWindowState } from '@/components/tests/test-window';
import { fmt, t } from '@/i18n/messages';

/** A student's progress through one course: passed modules, the current one and its test. */
export function CourseProgressBlock({ progress }: { progress: CourseProgress }) {
  const { passedModules, totalModules, current, course } = progress;
  const pct = totalModules === 0 ? 0 : Math.round((passedModules / totalModules) * 100);
  const label = fmt(t.dashboard.progress, { passed: passedModules, total: totalModules });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-ink text-sm font-semibold">{label}</p>
        <div
          role="progressbar"
          aria-label={fmt(t.dashboard.progressLabel, { course: course.title })}
          aria-valuemin={0}
          aria-valuemax={totalModules}
          aria-valuenow={passedModules}
          aria-valuetext={label}
          className="bg-soft border-line h-3 overflow-hidden rounded-full border"
        >
          <div className="bg-passed h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {current ? (
        <div className="bg-soft rounded-xl p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/learn/${course.slug}/${current.id}`}
              className="text-ink font-bold hover:underline"
            >
              {fmt(t.common.module, { number: current.order })}: {current.title}
            </Link>
            <ModuleStatusBadge status={current.status} />
          </div>
          {current.test && <TestHint test={current.test} failed={current.status === 'FAILED'} />}
        </div>
      ) : (
        passedModules === totalModules &&
        totalModules > 0 && (
          <p className="text-passed-ink text-sm font-bold">{t.dashboard.complete}</p>
        )
      )}
    </div>
  );
}

function TestHint({
  test,
  failed,
}: {
  test: NonNullable<NonNullable<CourseProgress['current']>['test']>;
  failed: boolean;
}) {
  const state = useWindowState(test);
  if (failed) {
    return <p className="text-failed-ink mt-1">{t.dashboard.outOfAttempts}</p>;
  }
  if (state === 'unknown' || state === 'closed') return null;
  return (
    <p className="text-ink-soft mt-1 flex items-center gap-1.5">
      <ClipboardList className="size-4 shrink-0" aria-hidden />
      {state === 'open' ? (
        <>
          <Link
            href={`/tests/${test.id}`}
            className="text-ink font-bold underline underline-offset-4"
          >
            {t.dashboard.testOpen}
          </Link>{' '}
          {fmt(t.dashboard.testUntil, { date: formatDate(test.closesAt, TEST_TIME_FORMAT) })}
        </>
      ) : (
        <>{fmt(t.dashboard.testOpens, { date: formatDate(test.opensAt, TEST_TIME_FORMAT) })}</>
      )}
    </p>
  );
}
