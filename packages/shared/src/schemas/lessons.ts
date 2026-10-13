import { z } from 'zod';
import {
  LESSON_CONTENT_MAX_LENGTH,
  LESSON_MAX_MINUTES,
  LESSON_TITLE_MAX_LENGTH,
  VIDEO_URL_PATTERN,
} from '../constants.js';
import { tooLong, tooShort } from './course.js';

export const videoUrlSchema = z
  .string()
  .trim()
  .regex(VIDEO_URL_PATTERN, 'Përdor një lidhje YouTube ose Vimeo');

/** Staff: create or edit an offline lesson. Empty strings clear the optional fields. */
export const lessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, tooShort(2))
    .max(LESSON_TITLE_MAX_LENGTH, tooLong(LESSON_TITLE_MAX_LENGTH)),
  /** Markdown. */
  content: z
    .string()
    .trim()
    .min(1, 'Shkruaj përmbajtjen e mësimit')
    .max(LESSON_CONTENT_MAX_LENGTH, tooLong(LESSON_CONTENT_MAX_LENGTH)),
  videoUrl: z.union([z.literal(''), videoUrlSchema]).optional(),
  estimatedMin: z
    .union([z.literal(''), z.coerce.number().int().min(1).max(LESSON_MAX_MINUTES)])
    .optional(),
});
export type LessonInput = z.input<typeof lessonSchema>;
export type LessonValues = z.output<typeof lessonSchema>;

/** Staff: the new order of a module's lessons (every lesson id, once). */
export const reorderLessonsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
