import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import {
  EnrollmentStatus,
  ModuleStatus,
  type Prisma,
  Role,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModuleAccessService } from '../course-modules/module-access.service.js';
import { materialSelect, type MaterialView, toMaterialView } from '../materials/material.view.js';
import { type ModuleRefRow, moduleRefSelect } from '../tests/test.view.js';
import type { CreateLessonDto } from './dto/create-lesson.dto.js';
import type { ReorderLessonsDto } from './dto/reorder-lessons.dto.js';
import type { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { lessonSummarySelect, type LessonSummaryRecord, toLessonSummary } from './lesson.view.js';

export interface LessonDetailRecord extends LessonSummaryRecord {
  content: string;
  videoUrl: string | null;
  materials: MaterialView[];
  module: ModuleRefRow;
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

export interface NextLessonRecord {
  lesson: { id: string; title: string; estimatedMin: number | null };
  module: ModuleRefRow;
  completedLessons: number;
  totalLessons: number;
}

/**
 * Offline learning: Markdown lessons per module, in order, with a per-student completion
 * mark. Access follows the module's rules (ModuleAccessService).
 */
@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ModuleAccessService,
  ) {}

  async list(user: AuthUser, moduleId: string): Promise<LessonSummaryRecord[]> {
    const { isStaff } = await this.access.assertCanView(user, moduleId);
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      select: {
        ...lessonSummarySelect,
        progress: { where: { userId: isStaff ? '' : user.id }, select: { completedAt: true } },
      },
    });
    return lessons.map((l) =>
      toLessonSummary(l, isStaff ? null : (l.progress[0]?.completedAt ?? null)),
    );
  }

  async find(user: AuthUser, id: string): Promise<LessonDetailRecord> {
    const head = await this.prisma.lesson.findUnique({ where: { id }, select: { moduleId: true } });
    if (!head) throw new NotFoundException('Mësimi nuk u gjet');
    const { isStaff } = await this.access.assertCanView(user, head.moduleId);
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id },
      select: {
        ...lessonSummarySelect,
        content: true,
        materials: { orderBy: { title: 'asc' }, select: materialSelect },
        module: { select: moduleRefSelect },
        progress: { where: { userId: isStaff ? '' : user.id }, select: { completedAt: true } },
      },
    });
    const [previous, next] = await Promise.all([
      this.prisma.lesson.findFirst({
        where: { moduleId: head.moduleId, order: { lt: lesson.order } },
        orderBy: { order: 'desc' },
        select: { id: true, title: true },
      }),
      this.prisma.lesson.findFirst({
        where: { moduleId: head.moduleId, order: { gt: lesson.order } },
        orderBy: { order: 'asc' },
        select: { id: true, title: true },
      }),
    ]);
    const { content, materials, module, progress, ...row } = lesson;
    return {
      ...toLessonSummary(row, isStaff ? null : (progress[0]?.completedAt ?? null)),
      content,
      videoUrl: row.videoUrl,
      materials: materials.map(toMaterialView),
      module,
      previous,
      next,
    };
  }

  async complete(user: AuthUser, id: string, done: boolean): Promise<LessonSummaryRecord> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: lessonSummarySelect,
    });
    if (!lesson) throw new NotFoundException('Mësimi nuk u gjet');
    const { isStaff } = await this.access.assertCanView(user, lesson.moduleId);
    if (isStaff)
      throw new BadRequestException('Vetëm studentët shënojnë mësimet si të përfunduara');
    if (done) {
      const progress = await this.prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: id } },
        update: {},
        create: { userId: user.id, lessonId: id },
        select: { completedAt: true },
      });
      return toLessonSummary(lesson, progress.completedAt);
    }
    await this.prisma.lessonProgress.deleteMany({ where: { userId: user.id, lessonId: id } });
    return toLessonSummary(lesson, null);
  }

  /**
   * The "continue where you left off" card: the first unfinished lesson of the student's
   * current module (ACTIVE or FAILED), across their courses. Null when there is nothing.
   */
  async nextForStudent(userId: string): Promise<NextLessonRecord | null> {
    const current = await this.prisma.moduleProgress.findMany({
      where: {
        userId,
        status: { in: [ModuleStatus.ACTIVE, ModuleStatus.FAILED] },
        module: {
          course: { enrollments: { some: { userId, status: EnrollmentStatus.APPROVED } } },
        },
      },
      orderBy: { unlockedAt: 'desc' },
      select: {
        module: {
          select: {
            ...moduleRefSelect,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                estimatedMin: true,
                progress: { where: { userId }, select: { lessonId: true } },
              },
            },
          },
        },
      },
    });
    for (const { module } of current) {
      if (module.lessons.length === 0) continue;
      const done = module.lessons.filter((l) => l.progress.length > 0).length;
      const next = module.lessons.find((l) => l.progress.length === 0);
      const { lessons: _lessons, ...ref } = module;
      if (!next) continue;
      return {
        lesson: { id: next.id, title: next.title, estimatedMin: next.estimatedMin },
        module: ref,
        completedLessons: done,
        totalLessons: module.lessons.length,
      };
    }
    return null;
  }

  // ---- Staff ----

  async create(
    user: AuthUser,
    moduleId: string,
    dto: CreateLessonDto,
  ): Promise<LessonSummaryRecord> {
    await this.access.assertStaff(user, moduleId);
    const lesson = await this.prisma.$transaction(async (tx) => {
      const last = await tx.lesson.findFirst({
        where: { moduleId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      return tx.lesson.create({
        data: {
          moduleId,
          order: (last?.order ?? 0) + 1,
          title: dto.title,
          content: dto.content,
          videoUrl: dto.videoUrl ?? null,
          estimatedMin: dto.estimatedMin ?? null,
        },
        select: lessonSummarySelect,
      });
    });
    return toLessonSummary(lesson, null);
  }

  async update(user: AuthUser, id: string, dto: UpdateLessonDto): Promise<LessonSummaryRecord> {
    await this.assertLessonStaff(user, id);
    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        videoUrl: dto.videoUrl,
        estimatedMin: dto.estimatedMin,
      },
      select: lessonSummarySelect,
    });
    return toLessonSummary(lesson, null);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const { moduleId } = await this.assertLessonStaff(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id } });
      await this.renumber(tx, moduleId);
    });
  }

  /** The new order: every lesson of the module, once. */
  async reorder(
    user: AuthUser,
    moduleId: string,
    dto: ReorderLessonsDto,
  ): Promise<LessonSummaryRecord[]> {
    await this.access.assertStaff(user, moduleId);
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    });
    const ids = new Set(lessons.map((l) => l.id));
    if (
      dto.ids.length !== ids.size ||
      dto.ids.some((id) => !ids.has(id)) ||
      new Set(dto.ids).size !== dto.ids.length
    ) {
      throw new BadRequestException('Renditja duhet të përmbajë çdo mësim të modulit, një herë');
    }
    await this.prisma.$transaction(async (tx) => {
      // Two passes keep the (moduleId, order) unique index happy while rows swap places.
      for (const [i, id] of dto.ids.entries()) {
        await tx.lesson.update({ where: { id }, data: { order: -(i + 1) } });
      }
      for (const [i, id] of dto.ids.entries()) {
        await tx.lesson.update({ where: { id }, data: { order: i + 1 } });
      }
    });
    return this.list(user, moduleId);
  }

  private async renumber(tx: Prisma.TransactionClient, moduleId: string): Promise<void> {
    const rows = await tx.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    for (const [i, row] of rows.entries()) {
      await tx.lesson.update({ where: { id: row.id }, data: { order: -(i + 1) } });
    }
    for (const [i, row] of rows.entries()) {
      await tx.lesson.update({ where: { id: row.id }, data: { order: i + 1 } });
    }
  }

  private async assertLessonStaff(user: AuthUser, id: string): Promise<{ moduleId: string }> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { moduleId: true },
    });
    if (!lesson) throw new NotFoundException('Mësimi nuk u gjet');
    if (user.role !== Role.ADMIN && user.role !== Role.INSTRUCTOR) {
      throw new NotFoundException('Mësimi nuk u gjet');
    }
    await this.access.assertStaff(user, lesson.moduleId);
    return lesson;
  }
}
