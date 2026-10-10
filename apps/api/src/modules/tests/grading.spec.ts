import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { QuestionType } from '../../generated/prisma/enums.js';
import {
  attemptDeadline,
  cleanAnswers,
  defaultTestWindow,
  type GradableQuestion,
  gradeAnswers,
  isOverdue,
} from './grading.js';

const questions: GradableQuestion[] = [
  {
    id: 'q1',
    type: QuestionType.SINGLE_CHOICE,
    points: 1,
    options: [
      { id: 'a', isCorrect: true },
      { id: 'b', isCorrect: false },
    ],
  },
  {
    id: 'q2',
    type: QuestionType.MULTI_CHOICE,
    points: 2,
    options: [
      { id: 'c', isCorrect: true },
      { id: 'd', isCorrect: true },
      { id: 'e', isCorrect: false },
    ],
  },
  {
    id: 'q3',
    type: QuestionType.TRUE_FALSE,
    points: 1,
    options: [
      { id: 't', isCorrect: false },
      { id: 'f', isCorrect: true },
    ],
  },
];

describe('gradeAnswers', () => {
  it('gives full marks for exactly the correct options', () => {
    expect(gradeAnswers(questions, { q1: ['a'], q2: ['d', 'c'], q3: ['f'] })).toEqual({
      earned: 4,
      total: 4,
      scorePct: 100,
    });
  });

  it('scores multiple choice all-or-nothing and skips unanswered questions', () => {
    // q2 is missing one correct option, q2 with an extra wrong one also fails, q3 is blank.
    expect(gradeAnswers(questions, { q1: ['a'], q2: ['c'] }).earned).toBe(1);
    expect(gradeAnswers(questions, { q2: ['c', 'd', 'e'] }).earned).toBe(0);
  });

  it('rounds the percentage down', () => {
    const three = questions.map((q) => ({ ...q, points: 1 }));
    // 2 of 3 = 66.67% → 66
    expect(gradeAnswers(three, { q1: ['a'], q3: ['f'] }).scorePct).toBe(66);
  });
});

describe('cleanAnswers', () => {
  it('drops duplicates and empty answers', () => {
    expect(cleanAnswers(questions, { q1: ['a', 'a'], q2: [], q3: ['t'] })).toEqual({
      q1: ['a'],
      q3: ['t'],
    });
  });

  it('rejects unknown questions and options, and two answers to a single choice', () => {
    expect(() => cleanAnswers(questions, { nope: ['a'] })).toThrow(BadRequestException);
    expect(() => cleanAnswers(questions, { q1: ['c'] })).toThrow(BadRequestException);
    expect(() => cleanAnswers(questions, { q1: ['a', 'b'] })).toThrow(BadRequestException);
    expect(() => cleanAnswers(questions, { q1: 'a' } as never)).toThrow(BadRequestException);
  });
});

describe('attemptDeadline and isOverdue', () => {
  const start = new Date('2026-11-01T10:00:00Z');

  it('ends after the time limit, or when the window closes if that is earlier', () => {
    expect(attemptDeadline(start, 45, new Date('2026-11-08T00:00:00Z'))).toEqual(
      new Date('2026-11-01T10:45:00Z'),
    );
    expect(attemptDeadline(start, 45, new Date('2026-11-01T10:20:00Z'))).toEqual(
      new Date('2026-11-01T10:20:00Z'),
    );
  });

  it('allows a short grace period after the deadline', () => {
    const deadline = new Date('2026-11-01T10:45:00Z');
    expect(isOverdue(deadline, new Date('2026-11-01T10:45:20Z'))).toBe(false);
    expect(isOverdue(deadline, new Date('2026-11-01T10:46:00Z'))).toBe(true);
  });
});

describe('defaultTestWindow', () => {
  const modules = [
    { order: 1, durationWeeks: 4 },
    { order: 2, durationWeeks: 4 },
  ];

  it('is the last week of the module, counted from the course start', () => {
    const start = new Date('2026-11-02T00:00:00Z');
    expect(defaultTestWindow(start, modules, 1)).toEqual({
      opensAt: new Date('2026-11-23T00:00:00Z'),
      closesAt: new Date('2026-11-30T00:00:00Z'),
    });
    expect(defaultTestWindow(start, modules, 2)).toEqual({
      opensAt: new Date('2026-12-21T00:00:00Z'),
      closesAt: new Date('2026-12-28T00:00:00Z'),
    });
  });

  it('counts from now when the course has no start date', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    expect(defaultTestWindow(null, modules, 1, now).closesAt).toEqual(
      new Date('2026-11-07T12:00:00Z'),
    );
  });
});
