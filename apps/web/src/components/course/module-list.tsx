import type { ModuleSummary } from '@ai-academy/shared';
import { Clock, UserRound } from 'lucide-react';

export function ModuleList({ modules }: { modules: ModuleSummary[] }) {
  return (
    <ol className="space-y-3">
      {modules.map((module) => (
        <li key={module.id} className="flex gap-4 rounded-xl border bg-white p-4">
          <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {module.order}
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-medium text-slate-900">{module.title}</h3>
            <p className="text-muted-foreground text-sm">{module.description}</p>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {module.durationWeeks} weeks · live on Google Meet · ends with a test
              </span>
              {module.instructor && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" aria-hidden />
                  {module.instructor.firstName} {module.instructor.lastName}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
