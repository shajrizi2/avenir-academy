'use client';

import { type LiveSessionSummary, SESSION_JOIN_WINDOW_MIN } from '@ai-academy/shared';
import { Video } from 'lucide-react';
import { formatDate } from '@/components/local-date-time';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';
import { useNow } from '@/lib/use-now';

const MINUTE = 60_000;

/**
 * "Join on Google Meet", active from 15 minutes before the start until the session ends.
 * The API only sends the Meet link inside that window, so the page refetches meanwhile.
 */
export function JoinButton({ session }: { session: LiveSessionSummary }) {
  const now = useNow();
  const start = new Date(session.startsAt).getTime();
  const opens = start - SESSION_JOIN_WINDOW_MIN * MINUTE;
  const ends = start + session.durationMin * MINUTE;

  if (now > ends) {
    return <p className="text-ink-soft text-sm font-semibold">{t.learn.session.ended}</p>;
  }

  if (now >= opens && session.meetUrl) {
    return (
      <Button asChild variant="chunky">
        <a href={session.meetUrl} target="_blank" rel="noopener noreferrer">
          <Video data-icon="inline-start" /> {t.learn.session.join}
          <span className="sr-only"> {t.common.opensInNewTab}</span>
        </a>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="chunky-outline" disabled>
        <Video data-icon="inline-start" />{' '}
        {now >= opens ? t.learn.session.opening : t.learn.session.join}
      </Button>
      {now > 0 && now < opens && (
        <p className="text-ink-soft text-xs">
          {fmt(t.learn.session.opensAt, { time: formatDate(new Date(opens), 'time') })}
        </p>
      )}
    </div>
  );
}
