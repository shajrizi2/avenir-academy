import { DEFAULT_TIMEZONE, SQ_MONTHS, SQ_WEEKDAYS, SQ_WEEKDAYS_SHORT } from './constants.js';

/**
 * Time-zone helpers shared by the API (emails, schedules) and the web app (every date the
 * platform shows is in Europe/Tirane). Only Intl is used, so no library is needed, and the
 * Albanian names come from our own constants because browsers ship no Albanian Intl data.
 */

export interface ZonedParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The wall-clock parts of an instant in a time zone. */
export function zonedParts(date: Date, timeZone = DEFAULT_TIMEZONE): ZonedParts {
  const parts: Record<string, string> = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(date)) {
    parts[type] = value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday ?? 'Sun'] ?? 0,
  };
}

/** The instant at which a wall-clock time happens in a time zone (DST-aware). */
export function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number },
  timeZone = DEFAULT_TIMEZONE,
): Date {
  const { year, month, day, hour = 0, minute = 0 } = parts;
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two rounds settle the offset even across a DST change.
  let utc = guess;
  for (let i = 0; i < 2; i++) {
    const seen = zonedParts(new Date(utc), timeZone);
    const seenUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    utc += guess - seenUtc;
  }
  return new Date(utc);
}

/** "YYYY-MM-DD" of an instant in a time zone (the calendar day it falls on there). */
export function localDateKey(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** The date key `days` days after a "YYYY-MM-DD" key. */
export function addDays(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday of a "YYYY-MM-DD" key. */
export function weekdayOf(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ---- Albanian formatting ----

export interface SqFormatOptions {
  timeZone?: string;
  /** Prefix the weekday name ("e hënë, 2 nëntor 2026"). */
  weekday?: boolean;
  /** Append the time ("… në 19:00"). */
  time?: boolean;
  /** Leave the year out ("2 nëntor"). */
  year?: boolean;
}

/** "e hënë, 2 nëntor 2026, 19:00" (parts optional) in a time zone, Europe/Tirane by default. */
export function formatSqDate(date: Date | string, options: SqFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { timeZone = DEFAULT_TIMEZONE, weekday = false, time = false, year = true } = options;
  const p = zonedParts(d, timeZone);
  let text = `${p.day} ${SQ_MONTHS[p.month - 1]}${year ? ` ${p.year}` : ''}`;
  if (weekday) text = `${SQ_WEEKDAYS[p.weekday]}, ${text}`;
  if (time) text += `, ${formatSqTime(d, timeZone)}`;
  return text;
}

/** "19:00" */
export function formatSqTime(date: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const p = zonedParts(d, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "19:00–21:00" */
export function formatSqTimeRange(
  start: Date | string,
  durationMin: number,
  timeZone = DEFAULT_TIMEZONE,
): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const end = new Date(s.getTime() + durationMin * 60_000);
  return `${formatSqTime(s, timeZone)}–${formatSqTime(end, timeZone)}`;
}

/** "Hën, Mër, Pre" for a list of weekday numbers (Sunday = 0). */
export function formatSqWeekdays(weekdays: readonly number[]): string {
  return [...weekdays]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => SQ_WEEKDAYS_SHORT[d] ?? '')
    .filter(Boolean)
    .join(', ');
}

/** "Hën, Mër, Pre · 19:00–21:00" */
export function formatSqSchedule(schedule: {
  weekdays: readonly number[];
  startTime: string;
  durationMin: number;
}): string {
  const [h, m] = schedule.startTime.split(':').map(Number);
  const endMinutes = h * 60 + m + schedule.durationMin;
  const end = `${pad(Math.floor(endMinutes / 60) % 24)}:${pad(endMinutes % 60)}`;
  return `${formatSqWeekdays(schedule.weekdays)} · ${schedule.startTime}–${end}`;
}
