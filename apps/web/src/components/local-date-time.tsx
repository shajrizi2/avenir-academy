import {
  DEFAULT_TIMEZONE,
  formatSqDate,
  formatSqTime,
  type SqFormatOptions,
} from '@ai-academy/shared';

export type DateStyle = 'date' | 'dateTime' | 'long' | 'longTime' | 'time' | 'short' | 'shortTime';

const STYLES: Record<DateStyle, SqFormatOptions | 'time'> = {
  /** 2 nëntor 2026 */
  date: {},
  /** 2 nëntor 2026, 19:00 */
  dateTime: { time: true },
  /** e hënë, 2 nëntor 2026 */
  long: { weekday: true },
  /** e hënë, 2 nëntor 2026, 19:00 */
  longTime: { weekday: true, time: true },
  /** 19:00 */
  time: 'time',
  /** 2 nëntor */
  short: { year: false },
  /** 2 nëntor, 19:00 */
  shortTime: { year: false, time: true },
};

interface LocalDateTimeProps {
  /** ISO-8601 UTC string from the API. */
  value: string;
  style?: DateStyle;
  className?: string;
}

/**
 * Renders a UTC timestamp in Albanian, in Europe/Tirane: every date on the platform is shown
 * in the academy's time zone (lectures are scheduled there), so the server and the client
 * render the same text and nothing shifts after hydration.
 */
export function LocalDateTime({ value, style = 'dateTime', className }: LocalDateTimeProps) {
  const options = STYLES[style];
  const text =
    options === 'time'
      ? formatSqTime(value, DEFAULT_TIMEZONE)
      : formatSqDate(value, { ...options, timeZone: DEFAULT_TIMEZONE });
  return (
    <time dateTime={value} className={className}>
      {text}
    </time>
  );
}

/** The same formatting as a plain string (for toasts, aria labels and templates). */
export function formatDate(value: string | Date, style: DateStyle = 'dateTime'): string {
  const options = STYLES[style];
  return options === 'time'
    ? formatSqTime(value, DEFAULT_TIMEZONE)
    : formatSqDate(value, { ...options, timeZone: DEFAULT_TIMEZONE });
}
