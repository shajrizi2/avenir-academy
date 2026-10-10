import { ModuleStatus, type Prisma } from '../../generated/prisma/client.js';
import { type ModuleRefRow, moduleRefSelect } from '../tests/test.view.js';

type Tx = Prisma.TransactionClient;

export interface LockedProgress {
  id: string;
  status: ModuleStatus;
  unlockedAt: Date | null;
}

/**
 * Reads a student's progress row for a module and locks it until the transaction ends, so
 * starting, grading and admin overrides for the same student and module run one at a time.
 */
export async function lockProgress(
  tx: Tx,
  userId: string,
  moduleId: string,
): Promise<LockedProgress | null> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "ModuleProgress"
    WHERE "userId" = ${userId} AND "moduleId" = ${moduleId}
    FOR UPDATE`;
  if (rows.length === 0) return null;
  return tx.moduleProgress.findUniqueOrThrow({
    where: { id: rows[0].id },
    select: { id: true, status: true, unlockedAt: true },
  });
}

/**
 * Attempts that count against the limit: those started since the module was (re)opened.
 * An admin reset sets `unlockedAt` to now, which gives the student a fresh set of attempts
 * while keeping the old ones for the record.
 */
export function countedAttemptsWhere(
  testId: string,
  userId: string,
  unlockedAt: Date | null,
): Prisma.TestAttemptWhereInput {
  return { testId, userId, ...(unlockedAt ? { startedAt: { gte: unlockedAt } } : {}) };
}

/**
 * Marks a module PASSED and opens the next one (order + 1) in the same transaction.
 * Returns the module that was unlocked, or null when it was the last one or already open.
 */
export async function passModule(
  tx: Tx,
  progressId: string,
  now = new Date(),
): Promise<ModuleRefRow | null> {
  const progress = await tx.moduleProgress.update({
    where: { id: progressId },
    data: { status: ModuleStatus.PASSED, passedAt: now },
    select: { userId: true, module: { select: { courseId: true, order: true } } },
  });
  const next = await tx.module.findUnique({
    where: {
      courseId_order: { courseId: progress.module.courseId, order: progress.module.order + 1 },
    },
    select: {
      ...moduleRefSelect,
      progress: { where: { userId: progress.userId }, select: { status: true } },
    },
  });
  if (!next) return null;

  const { progress: nextProgress, ...ref } = next;
  const current = nextProgress[0]?.status;
  if (current && current !== ModuleStatus.LOCKED) return null;
  await tx.moduleProgress.upsert({
    where: { userId_moduleId: { userId: progress.userId, moduleId: next.id } },
    update: { status: ModuleStatus.ACTIVE, unlockedAt: now },
    create: {
      userId: progress.userId,
      moduleId: next.id,
      status: ModuleStatus.ACTIVE,
      unlockedAt: now,
    },
  });
  return ref;
}
