'use client';

import type { ModuleStatus, ModuleTest } from '@ai-academy/shared';
import { ArrowRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { TestWindow, useWindowState } from '@/components/tests/test-window';
import { Button } from '@/components/ui/button';

/** The module's test on the student's module page. */
export function TestCard({ test, status }: { test: ModuleTest; status: ModuleStatus | null }) {
  const state = useWindowState(test);
  const passed = status === 'PASSED';

  return (
    <div className="border-ink rounded-card bg-background flex flex-col gap-5 border-2 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="bg-track-ai-tint text-track-ai-ink flex size-12 shrink-0 items-center justify-center rounded-xl">
        <ClipboardList className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-ink text-lg font-extrabold">{test.title}</p>
        <p className="text-ink-soft text-sm">
          {test.questionCount} questions · {test.timeLimitMin} minutes · pass mark {test.passMark}%
        </p>
        <p className="text-ink-soft text-sm">
          {state === 'open' ? (
            <strong className="text-passed-ink">Open now</strong>
          ) : state === 'closed' ? (
            'Closed'
          ) : (
            'Opens'
          )}{' '}
          · <TestWindow test={test} />
        </p>
      </div>
      <Button asChild variant={state === 'open' && !passed ? 'chunky' : 'chunky-outline'}>
        <Link href={`/tests/${test.id}`}>
          {passed ? 'See your result' : state === 'open' ? 'Take the test' : 'View test'}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}
