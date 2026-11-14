'use client';

import { postedLabel } from '@/lib/job-format';
import { useNow } from '@/lib/use-now';

/** "sot", "dje", "3 ditë më parë": needs the clock, so it appears once the page is running. */
export function PostedAgo({ value }: { value: string }) {
  const now = useNow();
  return <time dateTime={value}>{now ? postedLabel(value, now) : ''}</time>;
}
