'use client';

import type { AttemptAnswers, AttemptQuestion, AttemptSession } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Clock, Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';
import { attemptQuery } from '@/lib/queries';
import { useNowEverySecond } from '@/lib/use-now';
import { cn } from '@/lib/utils';

const AUTOSAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 5_000;

/** Takes a test: questions, a countdown, autosave, and hand-in (also when time runs out). */
interface AttemptRunnerProps {
  attemptId: string;
  testId: string;
  /** Called when the attempt is handed in (or was already), before showing the result. */
  onFinished: () => void;
}

export function AttemptRunner({ attemptId, testId, onFinished }: AttemptRunnerProps) {
  const router = useRouter();
  const { data, isPending, error } = useQuery(attemptQuery(attemptId));
  const finished = data !== undefined && data.status !== 'IN_PROGRESS';

  useEffect(() => {
    if (!finished) return;
    onFinished();
    router.replace(`/tests/${testId}/result`);
  }, [finished, onFinished, router, testId]);

  if (isPending || finished) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  return <Runner key={data.id} session={data} testId={testId} onFinished={onFinished} />;
}

type SaveState = 'saved' | 'pending' | 'error';

function Runner({
  session,
  testId,
  onFinished,
}: {
  session: AttemptSession;
  testId: string;
  onFinished: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<AttemptAnswers>(session.answers);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [submitting, setSubmitting] = useState(false);
  const latest = useRef(answers);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveSeq = useRef(0);
  const handedIn = useRef(false);

  const now = useNowEverySecond();
  const remaining = now === 0 ? null : Math.max(0, new Date(session.deadline).getTime() - now);
  const answered = session.questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length;
  const unanswered = session.questions.length - answered;

  async function save() {
    const seq = ++saveSeq.current;
    try {
      await apiFetch(`/attempts/${session.id}`, {
        method: 'PATCH',
        body: { answers: latest.current },
      });
      if (seq === saveSeq.current) setSaveState('saved');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Time is up or the attempt was handed in elsewhere: show the result.
        await handIn();
        return;
      }
      if (seq === saveSeq.current) {
        setSaveState('error');
        saveTimer.current = setTimeout(() => void save(), RETRY_DELAY_MS);
      }
    }
  }

  function choose(question: AttemptQuestion, optionId: string, checked: boolean) {
    const current = answers[question.id] ?? [];
    const next =
      question.type === 'MULTI_CHOICE'
        ? checked
          ? [...current, optionId]
          : current.filter((id) => id !== optionId)
        : [optionId];
    const all = { ...answers, [question.id]: next };
    setAnswers(all);
    latest.current = all;
    setSaveState('pending');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
  }

  async function handIn() {
    if (handedIn.current) return;
    handedIn.current = true;
    clearTimeout(saveTimer.current);
    setSubmitting(true);
    try {
      await apiFetch(`/attempts/${session.id}/submit`, {
        method: 'POST',
        body: { answers: latest.current },
      });
    } catch (e) {
      handedIn.current = false;
      setSubmitting(false);
      toast.error(errorMessage(e));
      throw e;
    }
    queryClient.removeQueries({ queryKey: attemptQuery(session.id).queryKey });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tests', testId] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['modules'] }),
    ]);
    onFinished();
    router.push(`/tests/${testId}/result`);
  }

  // Hand in automatically when the time is up.
  useEffect(() => {
    if (remaining === 0 && !handedIn.current) {
      toast.info('Time is up. Your test has been handed in.');
      handIn().catch(() => undefined);
    }
  });

  // Stop pending timers when leaving the page.
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  return (
    <>
      <header className="space-y-2">
        <p className="text-ink-soft text-sm font-bold">Test in progress</p>
        <h1 className="text-ink text-heading font-extrabold">{session.title}</h1>
      </header>

      <div className="border-line bg-background/95 rounded-card sticky top-16 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 border p-4 backdrop-blur-md">
        <Countdown remaining={remaining} />
        <p className="text-ink text-sm font-semibold">
          {answered} of {session.questions.length} answered
        </p>
        <SaveStatus state={saveState} />
        <div className="ml-auto">
          <ConfirmDialog
            trigger={
              <Button variant="chunky" disabled={submitting}>
                <Send data-icon="inline-start" /> {submitting ? 'Handing in…' : 'Hand in'}
              </Button>
            }
            title="Hand in your test?"
            description={
              unanswered > 0
                ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} still unanswered and will score zero. You can’t change your answers afterwards.`
                : 'You can’t change your answers afterwards.'
            }
            confirmLabel="Hand in"
            confirmVariant="chunky"
            onConfirm={handIn}
          />
        </div>
      </div>

      <ol className="space-y-6">
        {session.questions.map((question, index) => (
          <QuestionBlock
            key={question.id}
            question={question}
            number={index + 1}
            selected={answers[question.id] ?? []}
            disabled={submitting}
            onChoose={(optionId, checked) => choose(question, optionId, checked)}
          />
        ))}
      </ol>

      <div className="flex justify-end">
        <ConfirmDialog
          trigger={
            <Button variant="chunky" size="lg" disabled={submitting}>
              <Send data-icon="inline-start" /> Hand in the test
            </Button>
          }
          title="Hand in your test?"
          description={
            unanswered > 0
              ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} still unanswered and will score zero.`
              : 'You can’t change your answers afterwards.'
          }
          confirmLabel="Hand in"
          confirmVariant="chunky"
          onConfirm={handIn}
        />
      </div>
    </>
  );
}

function QuestionBlock({
  question,
  number,
  selected,
  disabled,
  onChoose,
}: {
  question: AttemptQuestion;
  number: number;
  selected: string[];
  disabled: boolean;
  onChoose: (optionId: string, checked: boolean) => void;
}) {
  const multi = question.type === 'MULTI_CHOICE';
  return (
    <li className="border-line rounded-card bg-background border p-5 sm:p-6">
      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="contents">
          <span className="text-ink-soft block text-sm font-bold">
            Question {number} · {question.points} point{question.points === 1 ? '' : 's'}
            {multi && ' · choose all that apply'}
          </span>
          <span className="text-ink mt-1 block text-lg font-bold">{question.text}</span>
        </legend>
        <div className="grid gap-3">
          {question.options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  'rounded-button text-ink flex min-h-12 cursor-pointer items-center gap-3 border-2 px-4 py-3 font-semibold transition-colors',
                  'has-focus-visible:ring-ring/50 has-focus-visible:ring-3',
                  checked ? 'border-ink bg-track-ai-tint' : 'border-line-strong hover:bg-soft',
                )}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={question.id}
                  value={option.id}
                  checked={checked}
                  onChange={(e) => onChoose(option.id, e.target.checked)}
                  className="accent-ink size-5 shrink-0"
                />
                {option.text}
              </label>
            );
          })}
        </div>
      </fieldset>
    </li>
  );
}

function Countdown({ remaining }: { remaining: number | null }) {
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);
  const label =
    seconds === null
      ? '--:--'
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const urgent = remaining !== null && remaining <= 60_000;
  const soon = remaining !== null && remaining <= 5 * 60_000;
  // Announced to screen readers only when it changes: at 5 minutes and at 1 minute.
  const announcement = urgent ? 'One minute left.' : soon ? 'Five minutes left.' : '';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1 text-lg font-extrabold tabular-nums',
        urgent
          ? 'bg-failed-tint text-failed-ink'
          : soon
            ? 'bg-active-tint text-active-ink'
            : 'bg-soft text-ink',
      )}
    >
      <Clock className="size-5" aria-hidden />
      <span role="timer" aria-label={`Time left ${label}`}>
        {label}
      </span>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-sm font-semibold',
        state === 'error' ? 'text-failed-ink' : 'text-ink-soft',
      )}
      aria-live="polite"
    >
      {state === 'saved' && (
        <>
          <Check className="size-4" aria-hidden /> Saved
        </>
      )}
      {state === 'pending' && (
        <>
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Saving…
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="size-4" aria-hidden /> Not saved, retrying…
        </>
      )}
    </p>
  );
}
