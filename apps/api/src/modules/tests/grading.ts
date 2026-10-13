import { ATTEMPT_GRACE_SEC, type AttemptAnswers, TEST_WINDOW_DAYS } from '@ai-academy/shared';
import { BadRequestException } from '@nestjs/common';
import { QuestionType } from '../../generated/prisma/enums.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  points: number;
  options: { id: string; isCorrect: boolean }[];
}

export interface Grade {
  earned: number;
  total: number;
  /** Rounded down, so 69.9% never passes a 70% mark. */
  scorePct: number;
}

/**
 * Scores an attempt. A question earns its points only when the chosen options are exactly
 * the correct ones (multiple choice is all-or-nothing). Unanswered questions earn nothing.
 */
export function gradeAnswers(questions: GradableQuestion[], answers: AttemptAnswers): Grade {
  let earned = 0;
  let total = 0;
  for (const question of questions) {
    total += question.points;
    const chosen = new Set(answers[question.id] ?? []);
    const correct = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    if (chosen.size === correct.length && correct.every((id) => chosen.has(id))) {
      earned += question.points;
    }
  }
  return { earned, total, scorePct: total === 0 ? 0 : Math.floor((earned / total) * 100) };
}

/**
 * Checks submitted answers against the test's questions and returns a clean copy:
 * unknown questions or options are rejected, duplicates are dropped, and single choice and
 * true/false questions take at most one option. An empty list means "no answer".
 */
export function cleanAnswers(
  questions: Pick<GradableQuestion, 'id' | 'type' | 'options'>[],
  answers: AttemptAnswers,
): AttemptAnswers {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const clean: AttemptAnswers = {};
  for (const [questionId, optionIds] of Object.entries(answers) as [string, unknown][]) {
    if (!Array.isArray(optionIds) || optionIds.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('Çdo përgjigje duhet të jetë një listë opsionesh');
    }
    const question = byId.get(questionId);
    if (!question)
      throw new BadRequestException('Një përgjigje i referohet një pyetjeje të panjohur');
    const valid = new Set(question.options.map((o) => o.id));
    const unique = [...new Set(optionIds as string[])];
    if (unique.some((id) => !valid.has(id))) {
      throw new BadRequestException('Një përgjigje i referohet një opsioni të panjohur');
    }
    if (question.type !== QuestionType.MULTI_CHOICE && unique.length > 1) {
      throw new BadRequestException('Zgjidh vetëm një përgjigje për këtë pyetje');
    }
    if (unique.length > 0) clean[questionId] = unique;
  }
  return clean;
}

/** When an attempt must be handed in: start + time limit, but never after the window closes. */
export function attemptDeadline(startedAt: Date, timeLimitMin: number, closesAt: Date): Date {
  return new Date(Math.min(startedAt.getTime() + timeLimitMin * MINUTE, closesAt.getTime()));
}

/** Saves and submissions get a short grace period after the deadline for network lag. */
export function isOverdue(deadline: Date, now = new Date()): boolean {
  return now.getTime() > deadline.getTime() + ATTEMPT_GRACE_SEC * 1000;
}

/**
 * The suggested test window: the module's last week. A module starts when the modules before
 * it have run their course, counted from the course start date (or from `now` without one).
 */
export function defaultTestWindow(
  courseStart: Date | null,
  modules: { order: number; durationWeeks: number }[],
  moduleOrder: number,
  now = new Date(),
): { opensAt: Date; closesAt: Date } {
  const weeksBefore = modules
    .filter((m) => m.order < moduleOrder)
    .reduce((sum, m) => sum + m.durationWeeks, 0);
  const own = modules.find((m) => m.order === moduleOrder)?.durationWeeks ?? 4;
  const start = (courseStart ?? now).getTime() + weeksBefore * 7 * DAY;
  const closesAt = new Date(start + own * 7 * DAY);
  return { opensAt: new Date(closesAt.getTime() - TEST_WINDOW_DAYS * DAY), closesAt };
}
