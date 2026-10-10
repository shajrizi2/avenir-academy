import { describe, expect, it } from 'vitest';
import { questionSchema, testSettingsSchema } from './tests.js';

const option = (text: string, isCorrect = false) => ({ text, isCorrect });

describe('questionSchema', () => {
  it('needs exactly one correct option for single choice', () => {
    const base = { type: 'SINGLE_CHOICE' as const, text: 'Pick one' };
    expect(
      questionSchema.safeParse({ ...base, options: [option('a', true), option('b')] }).success,
    ).toBe(true);
    expect(
      questionSchema.safeParse({ ...base, options: [option('a', true), option('b', true)] })
        .success,
    ).toBe(false);
    expect(questionSchema.safeParse({ ...base, options: [option('a'), option('b')] }).success).toBe(
      false,
    );
  });

  it('needs at least one correct option for multiple choice', () => {
    const base = { type: 'MULTI_CHOICE' as const, text: 'Pick some' };
    expect(
      questionSchema.safeParse({ ...base, options: [option('a', true), option('b', true)] })
        .success,
    ).toBe(true);
    expect(questionSchema.safeParse({ ...base, options: [option('a'), option('b')] }).success).toBe(
      false,
    );
  });

  it('needs exactly two options for true/false', () => {
    const base = { type: 'TRUE_FALSE' as const, text: 'Is it?' };
    expect(
      questionSchema.safeParse({
        ...base,
        options: [option('True'), option('False', true), option('Maybe')],
      }).success,
    ).toBe(false);
  });
});

describe('testSettingsSchema', () => {
  it('applies the defaults and rejects a window that closes before it opens', () => {
    const parsed = testSettingsSchema.parse({
      title: 'Module test',
      opensAt: '2026-11-01T09:00:00.000Z',
      closesAt: '2026-11-08T09:00:00.000Z',
    });
    expect(parsed).toMatchObject({ passMark: 70, timeLimitMin: 45, maxAttempts: 2 });
    expect(
      testSettingsSchema.safeParse({
        title: 'Module test',
        opensAt: '2026-11-08T09:00:00.000Z',
        closesAt: '2026-11-01T09:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
