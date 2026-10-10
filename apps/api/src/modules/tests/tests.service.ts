import { questionProblem } from '@ai-academy/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import { EnrollmentStatus, ModuleStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModuleAccessService } from '../course-modules/module-access.service.js';
import { AttemptsService } from './attempts.service.js';
import type { CreateTestDto } from './dto/create-test.dto.js';
import type { ReplaceQuestionsDto } from './dto/replace-questions.dto.js';
import type { UpdateTestDto } from './dto/update-test.dto.js';
import { defaultTestWindow } from './grading.js';
import {
  attemptSelect,
  type AttemptView,
  type ModuleRefRow,
  moduleRefSelect,
  optionOrder,
  type TestSettingsRow,
  testSettingsSelect,
  toAttemptView,
} from './test.view.js';

const staffTestSelect = {
  ...testSettingsSelect,
  moduleId: true,
  questions: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      type: true,
      text: true,
      points: true,
      options: { orderBy: optionOrder, select: { id: true, text: true, isCorrect: true } },
    },
  },
  _count: { select: { attempts: true } },
} as const satisfies Prisma.TestSelect;

type StaffTestRow = Prisma.TestGetPayload<{ select: typeof staffTestSelect }>;

export interface StaffTestRecord extends Omit<StaffTestRow, '_count'> {
  attemptCount: number;
}

export interface TestBuilderRecord {
  test: StaffTestRecord | null;
  defaultWindow: { opensAt: Date; closesAt: Date };
}

export interface TestResultsRecord {
  test: TestSettingsRow & { questionCount: number; module: ModuleRefRow };
  rows: {
    progressId: string | null;
    user: { id: string; firstName: string; lastName: string; email: string };
    status: ModuleStatus;
    attemptsUsed: number;
    attemptsLeft: number;
    bestScore: number | null;
    lastAttempt: AttemptView | null;
  }[];
}

function toStaffTest({ _count, ...test }: StaffTestRow): StaffTestRecord {
  return { ...test, attemptCount: _count.attempts };
}

/** The staff side of tests: building, scheduling, publishing and reading results. */
@Injectable()
export class TestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ModuleAccessService,
    private readonly attempts: AttemptsService,
  ) {}

  /** GET /modules/:id/test: the test with correct answers, or the suggested window. */
  async builder(user: AuthUser, moduleId: string): Promise<TestBuilderRecord> {
    await this.access.assertStaff(user, moduleId);
    const [test, defaultWindow] = await Promise.all([
      this.prisma.test.findUnique({ where: { moduleId }, select: staffTestSelect }),
      this.defaultWindow(moduleId),
    ]);
    return { test: test ? toStaffTest(test) : null, defaultWindow };
  }

  async create(user: AuthUser, moduleId: string, dto: CreateTestDto): Promise<StaffTestRecord> {
    await this.access.assertStaff(user, moduleId);
    const existing = await this.prisma.test.findUnique({
      where: { moduleId },
      select: { id: true },
    });
    if (existing) throw new ConflictException('This module already has a test');

    const fallback = await this.defaultWindow(moduleId);
    const opensAt = dto.opensAt ? new Date(dto.opensAt) : fallback.opensAt;
    const closesAt = dto.closesAt ? new Date(dto.closesAt) : fallback.closesAt;
    assertWindow(opensAt, closesAt);
    const test = await this.prisma.test.create({
      data: {
        moduleId,
        title: dto.title,
        passMark: dto.passMark,
        timeLimitMin: dto.timeLimitMin,
        maxAttempts: dto.maxAttempts,
        opensAt,
        closesAt,
      },
      select: staffTestSelect,
    });
    return toStaffTest(test);
  }

  async update(user: AuthUser, testId: string, dto: UpdateTestDto): Promise<StaffTestRecord> {
    const current = await this.assertTestStaff(user, testId);
    const opensAt = dto.opensAt ? new Date(dto.opensAt) : current.opensAt;
    const closesAt = dto.closesAt ? new Date(dto.closesAt) : current.closesAt;
    assertWindow(opensAt, closesAt);
    const test = await this.prisma.test.update({
      where: { id: testId },
      data: {
        title: dto.title,
        passMark: dto.passMark,
        timeLimitMin: dto.timeLimitMin,
        maxAttempts: dto.maxAttempts,
        opensAt,
        closesAt,
      },
      select: staffTestSelect,
    });
    return toStaffTest(test);
  }

  /**
   * Replaces every question. Locked once anyone has started an attempt, because saved answers
   * and scores refer to the existing questions and options.
   */
  async replaceQuestions(
    user: AuthUser,
    testId: string,
    dto: ReplaceQuestionsDto,
  ): Promise<StaffTestRecord> {
    await this.assertTestStaff(user, testId);
    dto.questions.forEach((q, index) => {
      const problem = questionProblem(q.type, q.options);
      if (problem) throw new BadRequestException(`Question ${index + 1}: ${problem}`);
    });

    const test = await this.prisma.$transaction(async (tx) => {
      const started = await tx.testAttempt.count({ where: { testId } });
      if (started > 0) {
        throw new ConflictException(
          'Students have already taken this test, so its questions can’t change',
        );
      }
      await tx.question.deleteMany({ where: { testId } });
      // One by one, so options keep their order (see optionOrder).
      for (const [index, q] of dto.questions.entries()) {
        await tx.question.create({
          data: {
            testId,
            order: index + 1,
            type: q.type,
            text: q.text,
            points: q.points ?? 1,
            options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) },
          },
        });
      }
      return tx.test.findUniqueOrThrow({ where: { id: testId }, select: staffTestSelect });
    });
    return toStaffTest(test);
  }

  async publish(user: AuthUser, testId: string, isPublished: boolean): Promise<StaffTestRecord> {
    await this.assertTestStaff(user, testId);
    if (isPublished) {
      const questions = await this.prisma.question.count({ where: { testId } });
      if (questions === 0) throw new ConflictException('Add questions before publishing the test');
    }
    const test = await this.prisma.test.update({
      where: { id: testId },
      data: { isPublished },
      select: staffTestSelect,
    });
    return toStaffTest(test);
  }

  async remove(user: AuthUser, testId: string): Promise<void> {
    await this.assertTestStaff(user, testId);
    const started = await this.prisma.testAttempt.count({ where: { testId } });
    if (started > 0) {
      throw new ConflictException('Students have already taken this test, so it can’t be deleted');
    }
    await this.prisma.test.delete({ where: { id: testId } });
  }

  /** GET /tests/:id/results: every approved student of the course and how they did. */
  async results(user: AuthUser, testId: string): Promise<TestResultsRecord> {
    const head = await this.assertTestStaff(user, testId);
    await this.attempts.expireOverdue({ testId });

    const test = await this.prisma.test.findUniqueOrThrow({
      where: { id: testId },
      select: {
        ...testSettingsSelect,
        module: { select: moduleRefSelect },
        _count: { select: { questions: true } },
      },
    });
    const [enrollments, progress, attempts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId: test.module.course.id, status: EnrollmentStatus.APPROVED },
        orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
        select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.moduleProgress.findMany({
        where: { moduleId: head.moduleId },
        select: { id: true, userId: true, status: true, unlockedAt: true },
      }),
      this.prisma.testAttempt.findMany({
        where: { testId },
        orderBy: { startedAt: 'desc' },
        select: { ...attemptSelect, userId: true },
      }),
    ]);

    const progressByUser = new Map(progress.map((p) => [p.userId, p]));
    const rows = enrollments.map(({ user: person }) => {
      const p = progressByUser.get(person.id);
      const mine = attempts
        .filter((a) => a.userId === person.id)
        .map(({ userId: _userId, ...a }) => a);
      const used = mine.filter((a) => !p?.unlockedAt || a.startedAt >= p.unlockedAt).length;
      const scores = mine.map((a) => a.scorePct).filter((s): s is number => s !== null);
      const status = p?.status ?? ModuleStatus.LOCKED;
      return {
        progressId: p?.id ?? null,
        user: person,
        status,
        attemptsUsed: used,
        attemptsLeft: status === ModuleStatus.ACTIVE ? Math.max(0, test.maxAttempts - used) : 0,
        bestScore: scores.length > 0 ? Math.max(...scores) : null,
        lastAttempt: mine[0] ? toAttemptView(mine[0], test) : null,
      };
    });
    const { _count, ...settings } = test;
    return { test: { ...settings, questionCount: _count.questions }, rows };
  }

  private async assertTestStaff(
    user: AuthUser,
    testId: string,
  ): Promise<{ moduleId: string; opensAt: Date; closesAt: Date }> {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: { moduleId: true, opensAt: true, closesAt: true },
    });
    if (!test) throw new NotFoundException('Test not found');
    await this.access.assertStaff(user, test.moduleId);
    return test;
  }

  private async defaultWindow(moduleId: string): Promise<{ opensAt: Date; closesAt: Date }> {
    const module = await this.prisma.module.findUniqueOrThrow({
      where: { id: moduleId },
      select: {
        order: true,
        course: {
          select: {
            startDate: true,
            modules: { select: { order: true, durationWeeks: true } },
          },
        },
      },
    });
    return defaultTestWindow(module.course.startDate, module.course.modules, module.order);
  }
}

function assertWindow(opensAt: Date, closesAt: Date): void {
  if (closesAt <= opensAt) throw new BadRequestException('The window must close after it opens');
}
