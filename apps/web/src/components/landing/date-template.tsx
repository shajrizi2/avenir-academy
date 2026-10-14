import { formatSqDate } from '@ai-academy/shared';

interface DateTemplateProps {
  /** Copy containing a `{date}` placeholder, e.g. "Grupi i parë nis më {date}". */
  template: string;
  /** ISO-8601 UTC timestamp, or a "YYYY-MM-DD" day. */
  value: string;
}

/**
 * Renders translated copy with a date such as "2 nëntor 2026". Month names come from our
 * own constants because browsers ship no Albanian Intl data; the day is read in
 * Europe/Tirane, where the academy schedules everything.
 */
export function DateTemplate({ template, value }: DateTemplateProps) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const [before, after = ''] = template.split('{date}');
  return (
    <>
      {before}
      <time dateTime={value}>{formatSqDate(date)}</time>
      {after}
    </>
  );
}
