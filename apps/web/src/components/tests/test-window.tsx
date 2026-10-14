'use client';

import type { TestSettings } from '@ai-academy/shared';
import { type DateStyle, LocalDateTime } from '@/components/local-date-time';
import { useNow } from '@/lib/use-now';

/** "2 nëntor, 19:00": the short style used wherever a test window is shown. */
export const TEST_TIME_FORMAT: DateStyle = 'shortTime';

export type WindowState = 'unknown' | 'upcoming' | 'open' | 'closed';

/** Where a test's window stands right now ('unknown' until the client clock is known). */
export function useWindowState(test: Pick<TestSettings, 'opensAt' | 'closesAt'>): WindowState {
  const now = useNow();
  if (now === 0) return 'unknown';
  if (now < new Date(test.opensAt).getTime()) return 'upcoming';
  if (now > new Date(test.closesAt).getTime()) return 'closed';
  return 'open';
}

/** "23 nëntor, 09:00 – 30 nëntor, 09:00" in Europe/Tirane. */
export function TestWindow({ test }: { test: Pick<TestSettings, 'opensAt' | 'closesAt'> }) {
  return (
    <>
      <LocalDateTime value={test.opensAt} style={TEST_TIME_FORMAT} /> –{' '}
      <LocalDateTime value={test.closesAt} style={TEST_TIME_FORMAT} />
    </>
  );
}
