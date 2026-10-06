'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

interface LocalDateTimeProps {
  /** ISO-8601 UTC string from the API. */
  value: string;
  options?: Intl.DateTimeFormatOptions;
  /** BCP 47 tag; defaults to the browser's language. */
  locale?: string;
}

/**
 * Renders a UTC timestamp in the viewer's local time zone. The server snapshot renders
 * UTC, then the client switches to local time after hydration, which avoids a mismatch.
 */
export function LocalDateTime({
  value,
  options = { dateStyle: 'medium', timeStyle: 'short' },
  locale,
}: LocalDateTimeProps) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(locale, options).format(new Date(value)),
    () =>
      new Intl.DateTimeFormat(locale ?? 'en-GB', { ...options, timeZone: 'UTC' }).format(
        new Date(value),
      ),
  );
  return <time dateTime={value}>{text}</time>;
}
