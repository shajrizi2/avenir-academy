import type { ModuleStatus } from '@ai-academy/shared';
import { Check, Lock, Sparkles } from 'lucide-react';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { format } from '@/i18n/format';
import type { LandingMessages } from '@/i18n/messages';
import { cn } from '@/lib/utils';

/** Example progress shown in the hero: module 1 passed, 2 active, 3–4 locked. */
const PATH_STATUSES: ModuleStatus[] = ['PASSED', 'ACTIVE', 'LOCKED', 'LOCKED'];

const STATUS_KEY = { PASSED: 'passed', ACTIVE: 'active', LOCKED: 'locked' } as const;

function StepMarker({ status, number }: { status: ModuleStatus; number: number }) {
  if (status === 'PASSED') {
    return (
      <span className="flex size-9 items-center justify-center rounded-full bg-green-600 text-white">
        <Check className="size-4" aria-hidden />
      </span>
    );
  }
  if (status === 'ACTIVE') {
    return (
      <span className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-sm font-semibold text-amber-800 ring-2 ring-amber-500">
        {number}
      </span>
    );
  }
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <Lock className="size-4" aria-hidden />
    </span>
  );
}

/** The hero visual: a learning path built in HTML/CSS (no stock imagery). */
export function ModulePath({ path }: { path: LandingMessages['hero']['path'] }) {
  return (
    <figure
      aria-label={path.label}
      className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-950/5 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{path.title}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{path.course}</p>
        </div>
        <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
          <Sparkles className="size-5" aria-hidden />
        </span>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="bg-primary h-full w-1/4 rounded-full" />
        </div>
        <p className="mt-2 text-xs text-slate-500">{path.progress}</p>
      </div>

      <ol className="mt-6 space-y-1">
        {path.modules.map((name, index) => {
          const status = PATH_STATUSES[index];
          const isLast = index === path.modules.length - 1;
          return (
            <li key={name} className="relative flex gap-4 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-10 bottom-0 left-[17px] w-0.5',
                    status === 'PASSED' ? 'bg-green-600' : 'bg-slate-200',
                  )}
                />
              )}
              <StepMarker status={status} number={index + 1} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {format(path.moduleLabel, { number: index + 1 })}
                  </p>
                  <p
                    className={cn(
                      'font-medium',
                      status === 'LOCKED' ? 'text-slate-500' : 'text-slate-900',
                    )}
                  >
                    {name}
                  </p>
                </div>
                <ModuleStatusBadge
                  status={status}
                  label={path.status[STATUS_KEY[status as keyof typeof STATUS_KEY]]}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <figcaption className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {path.footnote}
      </figcaption>
    </figure>
  );
}
