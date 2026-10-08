import type { LiveSessionSummary } from '@ai-academy/shared';
import { CalendarClock } from 'lucide-react';
import { LocalDateTime } from '@/components/local-date-time';
import { JoinButton } from './join-button';

/** One live session with its time and the Join button; `context` names the module. */
export function SessionCard({
  session,
  context,
}: {
  session: LiveSessionSummary;
  context?: React.ReactNode;
}) {
  return (
    <li className="border-line rounded-card bg-background flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <span className="bg-track-ai-tint text-track-ai-ink flex size-11 shrink-0 items-center justify-center rounded-xl">
          <CalendarClock className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          {context && <p className="text-ink-soft text-sm font-semibold">{context}</p>}
          <p className="text-ink font-bold">{session.title}</p>
          <p className="text-ink-soft text-sm">
            <LocalDateTime
              value={session.startsAt}
              options={{
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }}
            />{' '}
            · {session.durationMin} min
          </p>
        </div>
      </div>
      <JoinButton session={session} />
    </li>
  );
}
