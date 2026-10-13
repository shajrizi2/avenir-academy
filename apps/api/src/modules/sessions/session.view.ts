import { SESSION_JOIN_WINDOW_MIN } from '@ai-academy/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export const sessionSelect = {
  id: true,
  moduleId: true,
  groupId: true,
  title: true,
  startsAt: true,
  durationMin: true,
  meetUrl: true,
} as const satisfies Prisma.LiveSessionSelect;

type SessionRow = Prisma.LiveSessionGetPayload<{ select: typeof sessionSelect }>;

export interface SessionView extends Omit<SessionRow, 'meetUrl'> {
  meetUrl: string | null;
}

const MINUTE = 60_000;

/** A student may join from SESSION_JOIN_WINDOW_MIN before the start until the session ends. */
export function isJoinable(
  session: Pick<SessionRow, 'startsAt' | 'durationMin'>,
  now = new Date(),
): boolean {
  const opens = session.startsAt.getTime() - SESSION_JOIN_WINDOW_MIN * MINUTE;
  const ends = session.startsAt.getTime() + session.durationMin * MINUTE;
  return now.getTime() >= opens && now.getTime() <= ends;
}

export function hasEnded(
  session: Pick<SessionRow, 'startsAt' | 'durationMin'>,
  now = new Date(),
): boolean {
  return session.startsAt.getTime() + session.durationMin * MINUTE < now.getTime();
}

/** Staff always see the Meet link; students only while the session is joinable. */
export function toSessionView(
  session: SessionRow,
  isStaff: boolean,
  now = new Date(),
): SessionView {
  return { ...session, meetUrl: isStaff || isJoinable(session, now) ? session.meetUrl : null };
}
