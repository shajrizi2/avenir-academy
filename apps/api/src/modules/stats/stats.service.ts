import { Injectable } from '@nestjs/common';
import {
  AttemptStatus,
  EnrollmentStatus,
  ModuleStatus,
  Role,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const DAY = 24 * 60 * 60_000;

export interface AdminStatsRecord {
  students: number;
  instructors: number;
  publishedCourses: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  sessionsNext7Days: number;
  openTests: number;
  attemptsLast30Days: number;
  passRateLast30Days: number | null;
  failedModules: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The admin overview's numbers. */
  async overview(): Promise<AdminStatsRecord> {
    const now = new Date();
    const finishedSince = {
      status: { not: AttemptStatus.IN_PROGRESS },
      submittedAt: { gte: new Date(now.getTime() - 30 * DAY) },
    } as const;
    const [
      students,
      instructors,
      publishedCourses,
      pendingEnrollments,
      approvedEnrollments,
      sessionsNext7Days,
      openTests,
      attemptsLast30Days,
      passedLast30Days,
      failedModules,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.INSTRUCTOR } }),
      this.prisma.course.count({ where: { isPublished: true } }),
      this.prisma.enrollment.count({ where: { status: EnrollmentStatus.PENDING } }),
      this.prisma.enrollment.count({ where: { status: EnrollmentStatus.APPROVED } }),
      this.prisma.liveSession.count({
        where: { startsAt: { gte: now, lt: new Date(now.getTime() + 7 * DAY) } },
      }),
      this.prisma.test.count({
        where: { isPublished: true, opensAt: { lte: now }, closesAt: { gt: now } },
      }),
      this.prisma.testAttempt.count({ where: finishedSince }),
      this.prisma.testAttempt.count({ where: { ...finishedSince, passed: true } }),
      this.prisma.moduleProgress.count({ where: { status: ModuleStatus.FAILED } }),
    ]);
    return {
      students,
      instructors,
      publishedCourses,
      pendingEnrollments,
      approvedEnrollments,
      sessionsNext7Days,
      openTests,
      attemptsLast30Days,
      passRateLast30Days:
        attemptsLast30Days === 0 ? null : Math.round((passedLast30Days / attemptsLast30Days) * 100),
      failedModules,
    };
  }
}
