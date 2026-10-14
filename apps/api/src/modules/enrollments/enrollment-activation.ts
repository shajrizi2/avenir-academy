import { EnrollmentStatus, ModuleStatus, type Prisma } from '../../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

/**
 * Makes an enrollment APPROVED and creates its ModuleProgress rows: module 1 ACTIVE, the
 * rest LOCKED (existing rows are kept). Used when the first month is paid and when an admin
 * approves a request by hand.
 */
export async function activateEnrollment(
  tx: Tx,
  enrollmentId: string,
  now = new Date(),
): Promise<void> {
  const enrollment = await tx.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.APPROVED, decidedAt: now, holdExpiresAt: null },
    select: { userId: true, courseId: true },
  });
  const modules = await tx.module.findMany({
    where: { courseId: enrollment.courseId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  await tx.moduleProgress.createMany({
    data: modules.map((module, index) => ({
      userId: enrollment.userId,
      moduleId: module.id,
      status: index === 0 ? ModuleStatus.ACTIVE : ModuleStatus.LOCKED,
      unlockedAt: index === 0 ? now : null,
    })),
    skipDuplicates: true,
  });
}
