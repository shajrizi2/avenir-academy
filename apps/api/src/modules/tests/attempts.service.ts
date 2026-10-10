import type { AttemptAnswers } from '@ai-academy/shared';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import { AttemptStatus, ModuleStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModuleAccessService } from '../course-modules/module-access.service.js';
import { countedAttemptsWhere, lockProgress, passModule } from '../progress/progression.js';
import { attemptDeadline, cleanAnswers, gradeAnswers, isOverdue } from './grading.js';
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

type Tx = Prisma.TransactionClient;

export interface StudentTestRecord extends TestSettingsRow {
  module: ModuleRefRow;
  questionCount: number;
  totalPoints: number;
  status: ModuleStatus;
  attempts: AttemptView[];
  attemptsLeft: number;
  activeAttemptId: string | null;
  nextModule: ModuleRefRow | null;
}

export interface AttemptSessionRecord extends AttemptView {
  testId: string;
  title: string;
  questions: {
    id: string;
    order: number;
    type: string;
    text: string;
    points: number;
    options: { id: string; text: string }[];
  }[];
  answers: AttemptAnswers;
}

export interface AttemptResultRecord {
  attempt: AttemptView;
  passMark: number;
  moduleStatus: ModuleStatus;
  attemptsLeft: number;
  nextModule: ModuleRefRow | null;
}

/**
 * The student side of tests: starting, autosaving and submitting attempts. Grading happens
 * here only, and the questions students receive never include `isCorrect`.
 */
@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ModuleAccessService,
  ) {}

  /** GET /tests/:id: the test's rules, the student's attempts and what they can do next. */
  async overview(user: AuthUser, testId: string): Promise<StudentTestRecord> {
    const test = await this.findPublishedTest(testId);
    const { status } = await this.access.assertCanView(user, test.moduleId);
    await this.expireOverdue({ testId, userId: user.id });

    const [progress, attempts, points, next] = await Promise.all([
      this.prisma.moduleProgress.findUnique({
        where: { userId_moduleId: { userId: user.id, moduleId: test.moduleId } },
        select: { status: true, unlockedAt: true },
      }),
      this.prisma.testAttempt.findMany({
        where: { testId, userId: user.id },
        orderBy: { startedAt: 'desc' },
        select: attemptSelect,
      }),
      this.prisma.question.aggregate({ where: { testId }, _sum: { points: true } }),
      this.prisma.module.findFirst({
        where: {
          courseId: test.module.course.id,
          order: test.module.order + 1,
          progress: { some: { userId: user.id, status: { not: ModuleStatus.LOCKED } } },
        },
        select: moduleRefSelect,
      }),
    ]);
    const moduleStatus = progress?.status ?? status ?? ModuleStatus.LOCKED;
    const used = attempts.filter(
      (a) => !progress?.unlockedAt || a.startedAt >= progress.unlockedAt,
    ).length;
    const { moduleId: _moduleId, _count, ...settings } = test;
    return {
      ...settings,
      questionCount: _count.questions,
      totalPoints: points._sum.points ?? 0,
      status: moduleStatus,
      attempts: attempts.map((a) => toAttemptView(a, test)),
      attemptsLeft: moduleStatus === ModuleStatus.ACTIVE ? Math.max(0, test.maxAttempts - used) : 0,
      activeAttemptId: attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS)?.id ?? null,
      nextModule: next,
    };
  }

  /**
   * Starts an attempt, or returns the one already in progress. The student needs an ACTIVE
   * module, an open window and an attempt left.
   */
  async start(user: AuthUser, testId: string): Promise<AttemptSessionRecord> {
    const test = await this.findPublishedTest(testId);
    await this.access.assertCanView(user, test.moduleId);
    await this.expireOverdue({ testId, userId: user.id });

    const now = new Date();
    const attemptId = await this.prisma.$transaction(async (tx) => {
      const progress = await lockProgress(tx, user.id, test.moduleId);
      if (!progress) throw new ForbiddenException('You are not enrolled in this module');
      const open = await tx.testAttempt.findFirst({
        where: { testId, userId: user.id, status: AttemptStatus.IN_PROGRESS },
        select: { id: true },
      });
      if (open) return open.id;

      if (progress.status === ModuleStatus.PASSED) {
        throw new ConflictException('You have already passed this module');
      }
      if (progress.status !== ModuleStatus.ACTIVE) {
        throw new ConflictException(
          'You have used all your attempts. An admin can give you another try.',
        );
      }
      if (now < test.opensAt) throw new ConflictException('This test is not open yet');
      if (now > test.closesAt) throw new ConflictException('This test has closed');
      if (test._count.questions === 0) throw new ConflictException('This test has no questions');
      const used = await tx.testAttempt.count({
        where: countedAttemptsWhere(testId, user.id, progress.unlockedAt),
      });
      if (used >= test.maxAttempts) throw new ConflictException('You have no attempts left');

      const created = await tx.testAttempt.create({
        data: { testId, userId: user.id, answers: {} },
        select: { id: true },
      });
      return created.id;
    });
    return this.session(user, attemptId);
  }

  /** GET /attempts/:id: the attempt's questions (no correct answers) and saved answers. */
  async session(user: AuthUser, attemptId: string): Promise<AttemptSessionRecord> {
    const owned = await this.findOwnAttempt(user, attemptId);
    if (owned.status === AttemptStatus.IN_PROGRESS && isOverdue(owned.deadline)) {
      await this.finalize(attemptId, AttemptStatus.EXPIRED);
    }
    const attempt = await this.prisma.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: {
        ...attemptSelect,
        answers: true,
        test: {
          select: {
            id: true,
            title: true,
            timeLimitMin: true,
            closesAt: true,
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                order: true,
                type: true,
                text: true,
                points: true,
                // Never select isCorrect here: this goes to the student.
                options: { orderBy: optionOrder, select: { id: true, text: true } },
              },
            },
          },
        },
      },
    });
    const { test, answers, ...rest } = attempt;
    return {
      ...toAttemptView(rest, test),
      testId: test.id,
      title: test.title,
      questions: test.questions,
      answers: answers as AttemptAnswers,
    };
  }

  /** Autosave: replaces the saved answers while the attempt is in progress. */
  async save(
    user: AuthUser,
    attemptId: string,
    answers: AttemptAnswers,
  ): Promise<{ savedAt: Date }> {
    const attempt = await this.findOwnAttempt(user, attemptId);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException('This attempt has already been handed in');
    }
    if (isOverdue(attempt.deadline)) {
      await this.finalize(attemptId, AttemptStatus.EXPIRED);
      throw new ConflictException('Time is up. Your saved answers have been graded.');
    }
    const clean = cleanAnswers(await this.gradableQuestions(attempt.testId), answers);
    const savedAt = new Date();
    const { count } = await this.prisma.testAttempt.updateMany({
      where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
      data: { answers: clean },
    });
    if (count === 0) throw new ConflictException('This attempt has already been handed in');
    return { savedAt };
  }

  /**
   * Hands an attempt in and grades it. Submitting twice returns the same result. After the
   * deadline (plus the grace period) the final answers are ignored and the saved ones count.
   */
  async submit(
    user: AuthUser,
    attemptId: string,
    answers?: AttemptAnswers,
  ): Promise<AttemptResultRecord> {
    const attempt = await this.findOwnAttempt(user, attemptId);
    if (attempt.status === AttemptStatus.IN_PROGRESS && answers && !isOverdue(attempt.deadline)) {
      const clean = cleanAnswers(await this.gradableQuestions(attempt.testId), answers);
      await this.prisma.testAttempt.updateMany({
        where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
        data: { answers: clean },
      });
    }
    return this.finalize(attemptId, AttemptStatus.SUBMITTED);
  }

  /**
   * Grades every in-progress attempt that is past its deadline (plus the grace period) as
   * EXPIRED, using the answers saved so far. Runs on a timer and before reading results.
   */
  async expireOverdue(filter: { testId?: string; userId?: string } = {}): Promise<number> {
    const open = await this.prisma.testAttempt.findMany({
      where: { ...filter, status: AttemptStatus.IN_PROGRESS },
      select: {
        id: true,
        startedAt: true,
        test: { select: { timeLimitMin: true, closesAt: true } },
      },
    });
    const now = new Date();
    const overdue = open.filter((a) =>
      isOverdue(attemptDeadline(a.startedAt, a.test.timeLimitMin, a.test.closesAt), now),
    );
    for (const attempt of overdue) {
      try {
        await this.finalize(attempt.id, AttemptStatus.EXPIRED);
      } catch (error) {
        this.logger.error(`Could not expire attempt ${attempt.id}`, error as Error);
      }
    }
    return overdue.length;
  }

  /**
   * Grades an attempt and applies progression in one transaction: a pass sets the module to
   * PASSED and opens the next one; a fail with no attempts left sets it to FAILED.
   * A finished attempt is returned as it is.
   */
  private finalize(
    attemptId: string,
    requested: typeof AttemptStatus.SUBMITTED | typeof AttemptStatus.EXPIRED,
  ): Promise<AttemptResultRecord> {
    return this.prisma.$transaction(async (tx) => {
      const head = await tx.testAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: { userId: true, test: { select: { moduleId: true } } },
      });
      const progress = await lockProgress(tx, head.userId, head.test.moduleId);
      const attempt = await tx.testAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: {
          ...attemptSelect,
          userId: true,
          answers: true,
          test: {
            select: {
              id: true,
              passMark: true,
              maxAttempts: true,
              timeLimitMin: true,
              closesAt: true,
              questions: {
                select: {
                  id: true,
                  type: true,
                  points: true,
                  options: { select: { id: true, isCorrect: true } },
                },
              },
            },
          },
        },
      });
      const { test, userId, answers, ...row } = attempt;
      const now = new Date();
      let view = toAttemptView(row, test);
      let moduleStatus = progress?.status ?? ModuleStatus.LOCKED;
      let nextModule: ModuleRefRow | null = null;

      if (row.status === AttemptStatus.IN_PROGRESS) {
        const status =
          requested === AttemptStatus.SUBMITTED && !isOverdue(view.deadline, now)
            ? AttemptStatus.SUBMITTED
            : AttemptStatus.EXPIRED;
        const { scorePct } = gradeAnswers(test.questions, answers as AttemptAnswers);
        const passed = scorePct >= test.passMark;
        const updated = await tx.testAttempt.update({
          where: { id: attemptId },
          data: {
            status,
            submittedAt: status === AttemptStatus.EXPIRED ? view.deadline : now,
            scorePct,
            passed,
          },
          select: attemptSelect,
        });
        view = toAttemptView(updated, test);

        if (progress?.status === ModuleStatus.ACTIVE) {
          if (passed) {
            nextModule = await passModule(tx, progress.id, now);
            moduleStatus = ModuleStatus.PASSED;
          } else if (
            (await this.used(tx, test.id, userId, progress.unlockedAt)) >= test.maxAttempts
          ) {
            await tx.moduleProgress.update({
              where: { id: progress.id },
              data: { status: ModuleStatus.FAILED },
            });
            moduleStatus = ModuleStatus.FAILED;
          }
        }
      }

      const attemptsLeft =
        moduleStatus === ModuleStatus.ACTIVE && progress
          ? Math.max(
              0,
              test.maxAttempts - (await this.used(tx, test.id, userId, progress.unlockedAt)),
            )
          : 0;
      return { attempt: view, passMark: test.passMark, moduleStatus, attemptsLeft, nextModule };
    });
  }

  private used(tx: Tx, testId: string, userId: string, unlockedAt: Date | null): Promise<number> {
    return tx.testAttempt.count({ where: countedAttemptsWhere(testId, userId, unlockedAt) });
  }

  private async findPublishedTest(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: {
        ...testSettingsSelect,
        moduleId: true,
        module: { select: moduleRefSelect },
        _count: { select: { questions: true } },
      },
    });
    // Unpublished tests don't exist as far as students are concerned.
    if (!test?.isPublished) throw new NotFoundException('Test not found');
    return test;
  }

  /** Someone else's attempt is a 404, so attempt ids can't be probed. */
  private async findOwnAttempt(
    user: AuthUser,
    attemptId: string,
  ): Promise<{ status: AttemptStatus; testId: string; deadline: Date }> {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: {
        userId: true,
        status: true,
        startedAt: true,
        testId: true,
        test: { select: { timeLimitMin: true, closesAt: true } },
      },
    });
    if (!attempt || attempt.userId !== user.id) throw new NotFoundException('Attempt not found');
    return {
      status: attempt.status,
      testId: attempt.testId,
      deadline: attemptDeadline(
        attempt.startedAt,
        attempt.test.timeLimitMin,
        attempt.test.closesAt,
      ),
    };
  }

  private gradableQuestions(testId: string) {
    return this.prisma.question.findMany({
      where: { testId },
      select: { id: true, type: true, options: { select: { id: true, isCorrect: true } } },
    });
  }
}
