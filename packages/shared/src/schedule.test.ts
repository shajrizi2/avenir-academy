import { describe, expect, it } from 'vitest';
import { discountPercent, formatPrice } from './money.js';
import { generateSessionTimes, moduleOrderOfSession } from './schedule.js';
import {
  formatSqDate,
  formatSqSchedule,
  formatSqTimeRange,
  localDateKey,
  zonedParts,
  zonedTimeToUtc,
} from './time.js';

const tirane = 'Europe/Tirane';

describe('time zone helpers', () => {
  it('converts a Tirana wall-clock time to UTC in winter and summer', () => {
    // CET (UTC+1) in November, CEST (UTC+2) in June.
    expect(
      zonedTimeToUtc({ year: 2026, month: 11, day: 2, hour: 19, minute: 0 }, tirane).toISOString(),
    ).toBe('2026-11-02T18:00:00.000Z');
    expect(
      zonedTimeToUtc({ year: 2026, month: 6, day: 2, hour: 19, minute: 0 }, tirane).toISOString(),
    ).toBe('2026-06-02T17:00:00.000Z');
  });

  it('reads the local parts and the calendar day of an instant', () => {
    const parts = zonedParts(new Date('2026-11-02T18:00:00Z'), tirane);
    expect(parts).toMatchObject({ year: 2026, month: 11, day: 2, hour: 19, minute: 0, weekday: 1 });
    // 23:30 UTC is already the next day in Tirana.
    expect(localDateKey(new Date('2026-11-02T23:30:00Z'), tirane)).toBe('2026-11-03');
  });

  it('formats dates in Albanian', () => {
    const d = new Date('2026-11-02T18:00:00Z');
    expect(formatSqDate(d)).toBe('2 nëntor 2026');
    expect(formatSqDate(d, { weekday: true, time: true })).toBe('e hënë, 2 nëntor 2026, 19:00');
    expect(formatSqTimeRange(d, 120)).toBe('19:00–21:00');
    expect(formatSqSchedule({ weekdays: [5, 1, 3], startTime: '19:00', durationMin: 120 })).toBe(
      'Hën, Mër, Pre · 19:00–21:00',
    );
  });
});

describe('generateSessionTimes', () => {
  const schedule = {
    startDate: '2026-11-01',
    weekdays: [1, 3, 5],
    startTime: '19:00',
    timezone: tirane,
  };

  it('starts on the first scheduled weekday on or after the start date (1 Nov 2026 is a Sunday)', () => {
    const times = generateSessionTimes(schedule, 12);
    expect(times).toHaveLength(12);
    expect(times[0].toISOString()).toBe('2026-11-02T18:00:00.000Z'); // Monday
    expect(times[1].toISOString()).toBe('2026-11-04T18:00:00.000Z'); // Wednesday
    expect(times[2].toISOString()).toBe('2026-11-06T18:00:00.000Z'); // Friday
    // 12 sessions at 3 per week span exactly 4 weeks: the last is Friday 27 November.
    expect(times[11].toISOString()).toBe('2026-11-27T18:00:00.000Z');
  });

  it('keeps the local time across a DST change', () => {
    const times = generateSessionTimes({ ...schedule, startDate: '2026-10-19' }, 6);
    // Clocks go back on 25 October 2026: Monday the 26th is UTC+1 instead of UTC+2.
    expect(times[0].toISOString()).toBe('2026-10-19T17:00:00.000Z');
    expect(times[3].toISOString()).toBe('2026-10-26T18:00:00.000Z');
    expect(zonedParts(times[3], tirane).hour).toBe(19);
  });

  it('assigns 12 sessions to each module', () => {
    expect(moduleOrderOfSession(0)).toBe(1);
    expect(moduleOrderOfSession(11)).toBe(1);
    expect(moduleOrderOfSession(12)).toBe(2);
    expect(moduleOrderOfSession(47)).toBe(4);
  });

  it('returns nothing without weekdays', () => {
    expect(generateSessionTimes({ ...schedule, weekdays: [] }, 12)).toEqual([]);
  });
});

describe('money', () => {
  it('formats prices and discounts', () => {
    expect(formatPrice(8900, 'EUR')).toBe('€89');
    expect(formatPrice(8950, 'EUR')).toBe('€89,50');
    expect(discountPercent(8900, 15000)).toBe(41);
    expect(discountPercent(8900, null)).toBe(0);
    expect(discountPercent(8900, 8000)).toBe(0);
  });
});
