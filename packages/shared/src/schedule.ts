import { SESSIONS_PER_MODULE } from './constants.js';
import { addDays, weekdayOf, zonedTimeToUtc } from './time.js';

export interface GroupSchedule {
  /** "YYYY-MM-DD", a calendar day in `timezone`. */
  startDate: string;
  /** 0 = Sunday … 6 = Saturday */
  weekdays: readonly number[];
  /** "HH:mm" local time */
  startTime: string;
  timezone: string;
}

/**
 * The lecture times of a group: `count` sessions on the scheduled weekdays, starting with the
 * first scheduled weekday on or after the start date (2026-11-01 is a Sunday, so a Mon/Wed/Fri
 * group starts on Monday the 2nd). Returned as UTC instants, in order.
 */
export function generateSessionTimes(schedule: GroupSchedule, count: number): Date[] {
  const days = new Set(schedule.weekdays);
  if (days.size === 0 || count <= 0) return [];
  const [hour, minute] = schedule.startTime.split(':').map(Number);
  const times: Date[] = [];
  let key = schedule.startDate;
  // At most one week per session keeps the loop bounded whatever the weekdays are.
  for (let i = 0; times.length < count && i < count * 7 + 7; i++) {
    if (days.has(weekdayOf(key))) {
      const [year, month, day] = key.split('-').map(Number);
      times.push(zonedTimeToUtc({ year, month, day, hour, minute }, schedule.timezone));
    }
    key = addDays(key, 1);
  }
  return times;
}

/** Which module (1-based) the n-th session (0-based) belongs to: 12 sessions per module. */
export function moduleOrderOfSession(index: number): number {
  return Math.floor(index / SESSIONS_PER_MODULE) + 1;
}
