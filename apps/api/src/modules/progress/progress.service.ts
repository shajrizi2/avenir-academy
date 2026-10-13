import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, ModuleStatus, PaymentStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { lockProgress, passModule } from './progression.js';

export interface ProgressModuleRow {
  id: string;
  order: number;
  title: string;
  status: ModuleStatus;
  paid: boolean;
}

export interface CourseProgressRecord {
  course: { id: string; slug: string; title: string };
  totalModules: number;
  passedModules: number;
  modules: ProgressModuleRow[];
  current:
    (ProgressModuleRow & { test: { id: string; opensAt: Date; closesAt: Date } | null }) | null;
}

export interface ProgressRecord {
  id: string;
  status: ModuleStatus;
  unlockedAt: Date | null;
  passedAt: Date | null;
}

const progressRecordSelect = { id: true, status: true, unlockedAt: true, passedAt: true } as const;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /me/progress: each approved course with the student's status per module. */
  async forStudent(userId: string): Promise<CourseProgressRecord[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.APPROVED },
      orderBy: { decidedAt: 'asc' },
      select: {
        payments: { where: { status: PaymentStatus.CONFIRMED }, select: { moduleId: true } },
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            modules: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                order: true,
                title: true,
                progress: { where: { userId }, select: { status: true } },
                test: {
                  select: { id: true, opensAt: true, closesAt: true, isPublished: true },
                },
              },
            },
          },
        },
      },
    });

    return enrollments.map(({ payments, course: { modules, ...course } }) => {
      const paid = new Set(payments.map((p) => p.moduleId));
      const rows = modules.map(({ progress, test, ...m }) => ({
        ...m,
        status: progress[0]?.status ?? ModuleStatus.LOCKED,
        paid: paid.has(m.id),
        test: test?.isPublished
          ? { id: test.id, opensAt: test.opensAt, closesAt: test.closesAt }
          : null,
      }));
      const current = rows.find(
        (m) => m.status === ModuleStatus.ACTIVE || m.status === ModuleStatus.FAILED,
      );
      return {
        course,
        totalModules: rows.length,
        passedModules: rows.filter((m) => m.status === ModuleStatus.PASSED).length,
        modules: rows.map(({ test: _test, ...m }) => m),
        current: current ?? null,
      };
    });
  }

  /**
   * Admin override. ACTIVE unlocks a module or gives a FAILED student a fresh set of attempts
   * (attempts only count from `unlockedAt`, which is reset). PASSED passes the module by hand
   * and opens the next one, in one transaction.
   */
  async update(
    id: string,
    status: typeof ModuleStatus.ACTIVE | typeof ModuleStatus.PASSED,
  ): Promise<ProgressRecord> {
    const row = await this.prisma.moduleProgress.findUnique({
      where: { id },
      select: { userId: true, moduleId: true },
    });
    if (!row) throw new NotFoundException('Progresi nuk u gjet');

    return this.prisma.$transaction(async (tx) => {
      const progress = await lockProgress(tx, row.userId, row.moduleId);
      if (!progress) throw new NotFoundException('Progresi nuk u gjet');
      if (progress.status === ModuleStatus.PASSED) {
        throw new ConflictException('Studenti e ka kaluar tashmë këtë modul');
      }
      const now = new Date();
      if (status === ModuleStatus.PASSED) {
        await passModule(tx, id, now);
      } else {
        await tx.moduleProgress.update({
          where: { id },
          data: { status: ModuleStatus.ACTIVE, unlockedAt: now },
        });
      }
      return tx.moduleProgress.findUniqueOrThrow({ where: { id }, select: progressRecordSelect });
    });
  }
}
