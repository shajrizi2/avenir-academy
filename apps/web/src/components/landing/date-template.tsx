'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

interface DateTemplateProps {
  /** Copy containing a `{date}` placeholder, e.g. "Next cohort starts {date}". */
  template: string;
  /** ISO-8601 UTC timestamp. */
  value: string;
  /** Translated month names (January first). */
  months: string[];
}

/**
 * Renders translated copy with a date such as "27 tetor 2026" in the viewer's local time
 * zone. Month names come from the messages because browsers (Chrome included) ship no
 * Albanian Intl data, so `Intl.DateTimeFormat('sq')` silently falls back to English.
 * The server snapshot uses UTC; the client switches to local time after hydration.
 */
export function DateTemplate({ template, value, months }: DateTemplateProps) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatDate(value, months, false),
    () => formatDate(value, months, true),
  );
  const [before, after = ''] = template.split('{date}');
  return (
    <>
      {before}
      <time dateTime={value}>{text}</time>
      {after}
    </>
  );
}

function formatDate(value: string, months: string[], utc: boolean): string {
  const d = new Date(value);
  const day = utc ? d.getUTCDate() : d.getDate();
  const month = utc ? d.getUTCMonth() : d.getMonth();
  const year = utc ? d.getUTCFullYear() : d.getFullYear();
  return `${day} ${months[month]} ${year}`;
}
