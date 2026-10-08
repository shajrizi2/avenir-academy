import { describe, expect, it } from 'vitest';
import { hasEnded, isJoinable, toSessionView } from './session.view.js';

const MINUTE = 60_000;
const start = new Date('2026-11-02T18:00:00Z');
const session = {
  id: 's1',
  moduleId: 'm1',
  title: 'Week 1',
  startsAt: start,
  durationMin: 90,
  meetUrl: 'https://meet.google.com/abc-defg-hij',
};
const at = (minutesFromStart: number) => new Date(start.getTime() + minutesFromStart * MINUTE);

describe('session join window', () => {
  it('opens 15 minutes before the start and closes when the session ends', () => {
    expect(isJoinable(session, at(-16))).toBe(false);
    expect(isJoinable(session, at(-15))).toBe(true);
    expect(isJoinable(session, at(45))).toBe(true);
    expect(isJoinable(session, at(90))).toBe(true);
    expect(isJoinable(session, at(91))).toBe(false);
    expect(hasEnded(session, at(91))).toBe(true);
  });

  it('shows the Meet link to students only while joinable, and to staff always', () => {
    expect(toSessionView(session, false, at(-60)).meetUrl).toBeNull();
    expect(toSessionView(session, false, at(-5)).meetUrl).toBe(session.meetUrl);
    expect(toSessionView(session, true, at(-60)).meetUrl).toBe(session.meetUrl);
  });
});
