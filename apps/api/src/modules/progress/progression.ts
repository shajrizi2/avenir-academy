import {
  EnrollmentStatus,
  ModuleStatus,
  PaymentStatus,
  type Prisma,
} from '../../generated/prisma/client.js';
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

/** Whether the student has a CONFIRMED payment for the month of this module. */
export async function isModulePaid(tx: Tx, userId: string, moduleId: string): Promise<boolean> {
  const paid = await tx.payment.count({
    where: { moduleId, status: PaymentStatus.CONFIRMED, enrollment: { userId } },
  });
  return paid > 0;
}

/**
 * Opens a module for a student when everything is in place: they are enrolled, the module
 * is still LOCKED, the module before it is PASSED (or it is the first one) and the month is
 * paid. Called after a pass and after a payment is confirmed, so whichever comes last
 * unlocks. Returns the module when it was opened, else null.
 */
export async function unlockIfReady(
  tx: Tx,
  userId: string,
  moduleId: string,
  now = new Date(),
): Promise<ModuleRefRow | null> {
  const module = await tx.module.findUnique({
    where: { id: moduleId },
    select: {
      ...moduleRefSelect,
      progress: { where: { userId }, select: { status: true } },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          enrollments: { where: { userId }, select: { status: true } },
        },
      },
    },
  });
  if (!module) return null;
  if (module.course.enrollments[0]?.status !== EnrollmentStatus.APPROVED) return null;
  const current = module.progress[0]?.status;
  if (current && current !== ModuleStatus.LOCKED) return null;

  if (module.order > 1) {
    const previous = await tx.moduleProgress.findFirst({
      where: { userId, module: { courseId: module.course.id, order: module.order - 1 } },
      select: { status: true },
    });
    if (previous?.status !== ModuleStatus.PASSED) return null;
  }
  if (!(await isModulePaid(tx, userId, moduleId))) return null;

  await tx.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: { status: ModuleStatus.ACTIVE, unlockedAt: now },
    create: { userId, moduleId, status: ModuleStatus.ACTIVE, unlockedAt: now },
  });
  const { progress: _progress, course, ...ref } = module;
  return { ...ref, course: { id: course.id, slug: course.slug, title: course.title } };
}

/**
 * Marks a module PASSED and opens the next one (order + 1) in the same transaction, when
 * that month is paid (otherwise it opens as soon as the payment is confirmed).
 * Returns the module that was unlocked, or null when it was the last one, already open, or
 * still unpaid.
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
    select: { id: true },
  });
  if (!next) return null;
  return unlockIfReady(tx, progress.userId, next.id, now);
}
