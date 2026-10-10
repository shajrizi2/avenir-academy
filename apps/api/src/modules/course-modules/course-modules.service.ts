import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import {
  EnrollmentStatus,
  ModuleStatus,
  type Prisma,
  Role,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { materialSelect, type MaterialView, toMaterialView } from '../materials/material.view.js';
import {
  hasEnded,
  sessionSelect,
  type SessionView,
  toSessionView,
} from '../sessions/session.view.js';
import { type TestSettingsRow, testSettingsSelect } from '../tests/test.view.js';
import type { CreateModuleDto } from './dto/create-module.dto.js';
import type { UpdateModuleDto } from './dto/update-module.dto.js';
import { ModuleAccessService } from './module-access.service.js';

const instructorSelect = { select: { id: true, firstName: true, lastName: true } } as const;
const courseRefSelect = { select: { id: true, slug: true, title: true } } as const;

const moduleSummarySelect = {
  id: true,
  order: true,
  title: true,
  description: true,
  titleSq: true,
  descriptionSq: true,
  durationWeeks: true,
  instructor: instructorSelect,
} as const satisfies Prisma.ModuleSelect;

type ModuleSummaryRow = Prisma.ModuleGetPayload<{ select: typeof moduleSummarySelect }>;
type CourseRef = { id: string; slug: string; title: string };

export interface ModuleDetailRecord extends ModuleSummaryRow {
  course: CourseRef;
  status: ModuleStatus | null;
  canManage: boolean;
  sessions: SessionView[];
  materials: MaterialView[];
  test: (TestSettingsRow & { questionCount: number }) | null;
}

export interface TeachingModuleRecord {
  id: string;
  order: number;
  title: string;
  course: CourseRef;
  nextSession: SessionView | null;
  sessionCount: number;
  materialCount: number;
  studentCount: number;
}

export interface LearnCourseRecord extends CourseRef {
  summary: string;
  modules: (ModuleSummaryRow & { status: ModuleStatus })[];
}

@Injectable()
export class CourseModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ModuleAccessService,
  ) {}

  /**
   * Adds a module at the end of the course. Students who are already enrolled get a progress
   * row for it: ACTIVE when it is the first module or they passed the one before, else LOCKED.
   */
  async create(courseId: string, dto: CreateModuleDto): Promise<ModuleSummaryRow> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    await this.assertInstructor(dto.instructorId);

    return this.prisma.$transaction(async (tx) => {
      const last = await tx.module.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
        select: { id: true, order: true },
      });
      const order = (last?.order ?? 0) + 1;
      const module = await tx.module.create({
        data: {
          courseId,
          order,
          title: dto.title,
          description: dto.description,
          titleSq: dto.titleSq ?? null,
          descriptionSq: dto.descriptionSq ?? null,
          durationWeeks: dto.durationWeeks,
          instructorId: dto.instructorId ?? null,
        },
        select: moduleSummarySelect,
      });

      const enrolled = await tx.enrollment.findMany({
        where: { courseId, status: EnrollmentStatus.APPROVED },
        select: { userId: true },
      });
      if (enrolled.length > 0) {
        const passedPrevious = last
          ? new Set(
              (
                await tx.moduleProgress.findMany({
                  where: { moduleId: last.id, status: ModuleStatus.PASSED },
                  select: { userId: true },
                })
              ).map((p) => p.userId),
            )
          : null;
        const now = new Date();
        await tx.moduleProgress.createMany({
          data: enrolled.map(({ userId }) => {
            const active = !passedPrevious || passedPrevious.has(userId);
            return {
              userId,
              moduleId: module.id,
              status: active ? ModuleStatus.ACTIVE : ModuleStatus.LOCKED,
              unlockedAt: active ? now : null,
            };
          }),
          skipDuplicates: true,
        });
      }
      return module;
    });
  }

  async update(id: string, dto: UpdateModuleDto): Promise<ModuleSummaryRow> {
    await this.access.getModule(id);
    if (dto.instructorId !== undefined) await this.assertInstructor(dto.instructorId);
    return this.prisma.module.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        titleSq: dto.titleSq,
        descriptionSq: dto.descriptionSq,
        durationWeeks: dto.durationWeeks,
        instructorId: dto.instructorId,
      },
      select: moduleSummarySelect,
    });
  }

  /**
   * Only the last module of a course can be removed (orders stay 1..n, which progression
   * relies on), and only while no student has started it.
   */
  async remove(id: string): Promise<void> {
    const module = await this.access.getModule(id);
    const [last, started] = await Promise.all([
      this.prisma.module.findFirst({
        where: { courseId: module.courseId },
        orderBy: { order: 'desc' },
        select: { id: true },
      }),
      this.prisma.moduleProgress.count({
        where: { moduleId: id, status: { not: ModuleStatus.LOCKED } },
      }),
    ]);
    if (last?.id !== id) {
      throw new ConflictException('Only the last module of a course can be deleted');
    }
    if (started > 0) {
      throw new ConflictException(
        'Students have already started this module, so it cannot be deleted',
      );
    }
    await this.prisma.module.delete({ where: { id } });
  }

  async findDetail(user: AuthUser, id: string): Promise<ModuleDetailRecord> {
    const { isStaff, status } = await this.access.assertCanView(user, id);
    const module = await this.prisma.module.findUniqueOrThrow({
      where: { id },
      select: {
        ...moduleSummarySelect,
        course: courseRefSelect,
        sessions: { orderBy: { startsAt: 'asc' }, select: sessionSelect },
        materials: { orderBy: { title: 'asc' }, select: materialSelect },
        test: { select: { ...testSettingsSelect, _count: { select: { questions: true } } } },
      },
    });
    const now = new Date();
    const { test, ...rest } = module;
    let moduleTest: ModuleDetailRecord['test'] = null;
    // Students only see a test once it is published.
    if (test && (isStaff || test.isPublished)) {
      const { _count, ...settings } = test;
      moduleTest = { ...settings, questionCount: _count.questions };
    }
    return {
      ...rest,
      status,
      canManage: isStaff,
      sessions: module.sessions.map((s) => toSessionView(s, isStaff, now)),
      materials: module.materials.map(toMaterialView),
      test: moduleTest,
    };
  }

  /** The instructor's own modules; admins see every module. */
  async listTeaching(user: AuthUser): Promise<TeachingModuleRecord[]> {
    const modules = await this.prisma.module.findMany({
      where: user.role === Role.ADMIN ? undefined : { instructorId: user.id },
      orderBy: [{ course: { title: 'asc' } }, { order: 'asc' }],
      select: {
        id: true,
        order: true,
        title: true,
        course: {
          select: {
            ...courseRefSelect.select,
            _count: { select: { enrollments: { where: { status: EnrollmentStatus.APPROVED } } } },
          },
        },
        _count: { select: { sessions: true, materials: true } },
        sessions: {
          // Sessions last at most 8 hours, so anything older has certainly ended.
          where: { startsAt: { gte: new Date(Date.now() - 8 * 60 * 60_000) } },
          orderBy: { startsAt: 'asc' },
          take: 5,
          select: sessionSelect,
        },
      },
    });
    const now = new Date();
    return modules.map(({ course: { _count: courseCount, ...course }, _count, sessions, ...m }) => {
      const next = sessions.find((s) => !hasEnded(s, now));
      return {
        ...m,
        course,
        nextSession: next ? toSessionView(next, true, now) : null,
        sessionCount: _count.sessions,
        materialCount: _count.materials,
        studentCount: courseCount.enrollments,
      };
    });
  }

  /** An approved student's view of a course: every module with their own status. */
  async learnCourse(userId: string, slug: string): Promise<LearnCourseRecord> {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: {
        ...courseRefSelect.select,
        summary: true,
        enrollments: { where: { userId }, select: { status: true } },
        modules: {
          orderBy: { order: 'asc' },
          select: {
            ...moduleSummarySelect,
            progress: { where: { userId }, select: { status: true } },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.enrollments[0]?.status !== EnrollmentStatus.APPROVED) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
    const { enrollments: _enrollments, modules, ...rest } = course;
    return {
      ...rest,
      modules: modules.map(({ progress, ...m }) => ({
        ...m,
        status: progress[0]?.status ?? ModuleStatus.LOCKED,
      })),
    };
  }

  private async assertInstructor(instructorId: string | null | undefined): Promise<void> {
    if (!instructorId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: { role: true },
    });
    if (user?.role !== Role.INSTRUCTOR) {
      throw new BadRequestException('instructorId must belong to a user with the INSTRUCTOR role');
    }
  }
}
