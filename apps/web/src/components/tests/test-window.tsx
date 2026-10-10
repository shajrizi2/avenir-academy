'use client';

import type { TestSettings } from '@ai-academy/shared';
import { LocalDateTime } from '@/components/local-date-time';
import { useNow } from '@/lib/use-now';

export const TEST_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

export type WindowState = 'unknown' | 'upcoming' | 'open' | 'closed';

/** Where a test's window stands right now ('unknown' until the client clock is known). */
export function useWindowState(test: Pick<TestSettings, 'opensAt' | 'closesAt'>): WindowState {
  const now = useNow();
  if (now === 0) return 'unknown';
  if (now < new Date(test.opensAt).getTime()) return 'upcoming';
  if (now > new Date(test.closesAt).getTime()) return 'closed';
  return 'open';
}

/** "Mon 23 Nov, 09:00 – Mon 30 Nov, 09:00" in the viewer's time zone. */
export function TestWindow({ test }: { test: Pick<TestSettings, 'opensAt' | 'closesAt'> }) {
  return (
    <>
      <LocalDateTime value={test.opensAt} options={TEST_TIME_FORMAT} /> –{' '}
      <LocalDateTime value={test.closesAt} options={TEST_TIME_FORMAT} />
    </>
  );
}
