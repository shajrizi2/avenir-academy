import { z } from 'zod';
import { SLUG_PATTERN } from '../constants.js';

/** An optional translation: empty means "not translated" (falls back to English). */
export const optionalTranslation = (min: number, max: number) =>
  z.union([z.literal(''), z.string().trim().min(min).max(max)]).optional();

export const courseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and dashes'),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(10).max(10_000),
  titleSq: optionalTranslation(3, 120),
  summarySq: optionalTranslation(10, 300),
  descriptionSq: optionalTranslation(10, 10_000),
  coverUrl: z.url().max(500).optional(),
  startDate: z.iso.datetime().optional(),
  isPublished: z.boolean().optional(),
});
export type CourseInput = z.infer<typeof courseSchema>;
