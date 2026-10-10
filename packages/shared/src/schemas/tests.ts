import { z } from 'zod';
import {
  OPTION_TEXT_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MAX_POINTS,
  QUESTION_MIN_OPTIONS,
  QUESTION_TEXT_MAX_LENGTH,
  TEST_DEFAULTS,
  TEST_MAX_ATTEMPTS,
  TEST_MAX_QUESTIONS,
  TEST_MAX_TIME_LIMIT_MIN,
  TEST_MIN_TIME_LIMIT_MIN,
  TEST_TITLE_MAX_LENGTH,
} from '../constants.js';

/** The fields without the window check, so forms can swap the date inputs (zod can't extend a refined object). */
export const testSettingsFields = z.object({
  title: z.string().trim().min(3).max(TEST_TITLE_MAX_LENGTH),
  passMark: z.coerce.number().int().min(1).max(100).default(TEST_DEFAULTS.passMark),
  timeLimitMin: z.coerce
    .number()
    .int()
    .min(TEST_MIN_TIME_LIMIT_MIN)
    .max(TEST_MAX_TIME_LIMIT_MIN)
    .default(TEST_DEFAULTS.timeLimitMin),
  maxAttempts: z.coerce
    .number()
    .int()
    .min(1)
    .max(TEST_MAX_ATTEMPTS)
    .default(TEST_DEFAULTS.maxAttempts),
  opensAt: z.iso.datetime({ message: 'Pick a date and time' }),
  closesAt: z.iso.datetime({ message: 'Pick a date and time' }),
});

export const testSettingsSchema = testSettingsFields.refine(
  (v) => new Date(v.closesAt) > new Date(v.opensAt),
  { message: 'The window must close after it opens', path: ['closesAt'] },
);
export type TestSettingsInput = z.input<typeof testSettingsSchema>;

export const optionSchema = z.object({
  text: z.string().trim().min(1, 'Write the answer').max(OPTION_TEXT_MAX_LENGTH),
  isCorrect: z.boolean(),
});

export const questionSchema = z
  .object({
    type: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE']),
    text: z.string().trim().min(3, 'Write the question').max(QUESTION_TEXT_MAX_LENGTH),
    points: z.coerce.number().int().min(1).max(QUESTION_MAX_POINTS).default(1),
    options: z.array(optionSchema).min(QUESTION_MIN_OPTIONS).max(QUESTION_MAX_OPTIONS),
  })
  .superRefine((q, ctx) => {
    const problem = questionProblem(q.type, q.options);
    if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['options'] });
  });
export type QuestionInput = z.input<typeof questionSchema>;

export const questionsSchema = z.object({
  questions: z.array(questionSchema).min(1, 'Add at least one question').max(TEST_MAX_QUESTIONS),
});
export type QuestionsInput = z.input<typeof questionsSchema>;

/**
 * The rule each question type follows, shared by the web form and the API:
 * single choice and true/false have exactly one correct option (true/false has exactly two),
 * multiple choice has at least one. Returns null when the question is valid.
 */
export function questionProblem(
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TRUE_FALSE',
  options: readonly { isCorrect: boolean }[],
): string | null {
  const correct = options.filter((o) => o.isCorrect).length;
  if (type === 'TRUE_FALSE' && options.length !== 2) {
    return 'A true/false question has exactly two options';
  }
  if (type === 'MULTI_CHOICE') {
    return correct >= 1 ? null : 'Mark at least one correct answer';
  }
  return correct === 1 ? null : 'Mark exactly one correct answer';
}

export const publishTestSchema = z.object({ isPublished: z.boolean() });

/** The answers of an attempt: question id → the chosen option ids. */
export const attemptAnswersSchema = z.object({
  answers: z.record(z.string(), z.array(z.string()).max(QUESTION_MAX_OPTIONS)),
});
export type AttemptAnswersInput = z.infer<typeof attemptAnswersSchema>;

/** Admin override: unlock a module / reset its attempts (ACTIVE) or mark it passed (PASSED). */
export const updateProgressSchema = z.object({ status: z.enum(['ACTIVE', 'PASSED']) });
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
