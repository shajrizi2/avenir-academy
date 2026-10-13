import { z } from 'zod';
import {
  DEFAULT_TIMEZONE,
  GROUP_DEFAULT_CAPACITY,
  GROUP_MAX_CAPACITY,
  GROUP_NAME_MAX_LENGTH,
  LECTURE_DURATION_MIN,
  SESSION_MAX_DURATION_MIN,
  SESSION_MIN_DURATION_MIN,
  TIME_PATTERN,
} from '../constants.js';
import { tooLong, tooShort } from './course.js';
import { meetUrlSchema } from './learning.js';

const weekdaySchema = z.number().int().min(0).max(6);

/** "YYYY-MM-DD" */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Zgjidh një datë')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Zgjidh një datë të vlefshme');

/** Admin: create or edit a cohort. */
export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, tooShort(2))
    .max(GROUP_NAME_MAX_LENGTH, tooLong(GROUP_NAME_MAX_LENGTH)),
  startDate: dateKeySchema,
  weekdays: z.array(weekdaySchema).min(1, 'Zgjidh të paktën një ditë').max(7),
  startTime: z.string().regex(TIME_PATTERN, 'Shkruaj orën si 19:00'),
  durationMin: z.coerce
    .number()
    .int()
    .min(SESSION_MIN_DURATION_MIN)
    .max(SESSION_MAX_DURATION_MIN)
    .default(LECTURE_DURATION_MIN),
  timezone: z.string().min(1).default(DEFAULT_TIMEZONE),
  capacity: z.coerce
    .number()
    .int()
    .min(1, 'Të paktën 1 vend')
    .max(GROUP_MAX_CAPACITY, `Më së shumti ${GROUP_MAX_CAPACITY} persona për grup`)
    .default(GROUP_DEFAULT_CAPACITY),
  status: z.enum(['OPEN', 'FULL', 'RUNNING', 'FINISHED']).optional(),
  /** Empty string = no instructor. */
  instructorId: z.string().optional(),
  meetUrl: z.union([z.literal(''), meetUrlSchema]).optional(),
  offlineEmailDays: z.array(weekdaySchema).max(7).optional(),
});
export type GroupInput = z.input<typeof groupSchema>;
export type GroupValues = z.output<typeof groupSchema>;
