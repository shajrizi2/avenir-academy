import type { AttemptSummary } from '@ai-academy/shared';
import { LocalDateTime } from '@/components/local-date-time';
import { fmt, t } from '@/i18n/messages';
import { cn } from '@/lib/utils';

/** Finished attempts, newest first, with score and outcome. */
export function AttemptHistory({
  attempts,
  passMark,
}: {
  attempts: AttemptSummary[];
  passMark: number;
}) {
  return (
    <ol className="border-line rounded-card bg-background divide-line divide-y border">
      {attempts.map((attempt, index) => (
        <li key={attempt.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4">
          <p className="text-ink min-w-32 font-bold">
            {fmt(t.tests.history.attempt, { number: attempts.length - index })}
          </p>
          <p className="text-ink-soft flex-1 text-sm">
            <LocalDateTime value={attempt.submittedAt ?? attempt.startedAt} style="dateTime" />
            {attempt.status === 'EXPIRED' && ` · ${t.tests.history.timeRanOut}`}
          </p>
          <p
            className={cn('font-extrabold', attempt.passed ? 'text-passed-ink' : 'text-failed-ink')}
          >
            {attempt.scorePct ?? 0}%{' '}
            <span className="text-sm font-semibold">
              {attempt.passed ? t.tests.history.passed : fmt(t.tests.history.needs, { passMark })}
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}
