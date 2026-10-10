import type { Prisma } from '../../generated/prisma/client.js';
import { attemptDeadline } from './grading.js';

export const testSettingsSelect = {
  id: true,
  title: true,
  passMark: true,
  timeLimitMin: true,
  maxAttempts: true,
  opensAt: true,
  closesAt: true,
  isPublished: true,
} as const satisfies Prisma.TestSelect;

export type TestSettingsRow = Prisma.TestGetPayload<{ select: typeof testSettingsSelect }>;

export const attemptSelect = {
  id: true,
  status: true,
  startedAt: true,
  submittedAt: true,
  scorePct: true,
  passed: true,
} as const satisfies Prisma.TestAttemptSelect;

type AttemptRow = Prisma.TestAttemptGetPayload<{ select: typeof attemptSelect }>;

export interface AttemptView extends AttemptRow {
  deadline: Date;
}

export const moduleRefSelect = {
  id: true,
  order: true,
  title: true,
  course: { select: { id: true, slug: true, title: true } },
} as const satisfies Prisma.ModuleSelect;

export type ModuleRefRow = Prisma.ModuleGetPayload<{ select: typeof moduleRefSelect }>;

export function toAttemptView(
  attempt: AttemptRow,
  test: { timeLimitMin: number; closesAt: Date },
): AttemptView {
  return {
    ...attempt,
    deadline: attemptDeadline(attempt.startedAt, test.timeLimitMin, test.closesAt),
  };
}

/** Options keep their creation order (cuid ids sort by creation time). */
export const optionOrder = { id: 'asc' } as const;
