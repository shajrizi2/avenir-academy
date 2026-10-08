import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import { EnrollmentStatus, ModuleStatus, Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ModuleAccessRow {
  id: string;
  courseId: string;
  order: number;
  instructorId: string | null;
}

export interface ModuleAccess {
  module: ModuleAccessRow;
  /** True for admins and the module's own instructor. */
  isStaff: boolean;
  /** The student's progress status; null for staff. */
  status: ModuleStatus | null;
}

/**
 * Who may see or manage a module:
 * - admins: everything;
 * - instructors: only modules where `module.instructorId === user.id`;
 * - students: only with an APPROVED enrollment in the course and a module that isn't LOCKED.
 */
@Injectable()
export class ModuleAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getModule(moduleId: string): Promise<ModuleAccessRow> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true, courseId: true, order: true, instructorId: true },
    });
    if (!module) throw new NotFoundException('Module not found');
    return module;
  }

  isStaff(user: AuthUser, module: Pick<ModuleAccessRow, 'instructorId'>): boolean {
    return (
      user.role === Role.ADMIN || (user.role === Role.INSTRUCTOR && module.instructorId === user.id)
    );
  }

  /** For write operations: admins and the module's instructor only. */
  async assertStaff(user: AuthUser, moduleId: string): Promise<ModuleAccessRow> {
    const module = await this.getModule(moduleId);
    if (!this.isStaff(user, module)) {
      throw new ForbiddenException('Only this module’s instructor or an admin can do that');
    }
    return module;
  }

  /** For reading a module's content (sessions, materials, downloads). */
  async assertCanView(user: AuthUser, moduleId: string): Promise<ModuleAccess> {
    const module = await this.getModule(moduleId);
    if (this.isStaff(user, module)) return { module, isStaff: true, status: null };
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only this module’s instructor or an admin can open it');
    }

    const [enrollment, progress] = await Promise.all([
      this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: module.courseId } },
        select: { status: true },
      }),
      this.prisma.moduleProgress.findUnique({
        where: { userId_moduleId: { userId: user.id, moduleId } },
        select: { status: true },
      }),
    ]);
    if (enrollment?.status !== EnrollmentStatus.APPROVED) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
    const status = progress?.status ?? ModuleStatus.LOCKED;
    if (status === ModuleStatus.LOCKED) {
      throw new ForbiddenException('This module is locked. Pass the previous module’s test first.');
    }
    return { module, isStaff: false, status };
  }
}
