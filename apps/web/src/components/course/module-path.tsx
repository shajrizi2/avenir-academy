import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PathStep {
  id: string;
  order: number;
  title: string;
  /** Small line above the title, e.g. "Module 2 · Unlocks after module 1". */
  caption: string;
  children?: React.ReactNode;
}

/**
 * A course's modules as a vertical path: the first step in the track colour, the rest
 * behind a lock. Shows the public order of a track, not a student's own progress
 * (that uses <ModuleStatusBadge>).
 */
export function ModulePath({ steps, accent }: { steps: PathStep[]; accent: string }) {
  return (
    <ol>
      {steps.map((step, i) => {
        const first = i === 0;
        const last = i === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span aria-hidden className="bg-ink/20 absolute top-11 bottom-1 left-[19px] w-0.5" />
            )}
            <span
              aria-hidden
              className={cn(
                'border-ink flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold',
                first ? cn(accent, 'text-ink') : 'bg-background text-ink-soft',
              )}
            >
              {first ? step.order : <Lock className="size-4" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-ink-soft text-xs font-semibold">{step.caption}</p>
              <p className="text-ink font-bold">{step.title}</p>
              {step.children}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
