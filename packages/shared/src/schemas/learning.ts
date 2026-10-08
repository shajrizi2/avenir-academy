import { z } from 'zod';
import {
  ENROLLMENT_NOTE_MAX_LENGTH,
  MATERIAL_TITLE_MAX_LENGTH,
  MEET_URL_PATTERN,
  MODULE_DESCRIPTION_MAX_LENGTH,
  MODULE_MAX_DURATION_WEEKS,
  MODULE_TITLE_MAX_LENGTH,
  SESSION_DEFAULT_DURATION_MIN,
  SESSION_MAX_DURATION_MIN,
  SESSION_MIN_DURATION_MIN,
  SESSION_TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../constants.js';

export const decideEnrollmentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(ENROLLMENT_NOTE_MAX_LENGTH).optional(),
});
export type DecideEnrollmentInput = z.infer<typeof decideEnrollmentSchema>;

export const moduleSchema = z.object({
  title: z.string().trim().min(3).max(MODULE_TITLE_MAX_LENGTH),
  description: z.string().trim().min(10).max(MODULE_DESCRIPTION_MAX_LENGTH),
  durationWeeks: z.coerce.number().int().min(1).max(MODULE_MAX_DURATION_WEEKS),
  /** Empty string = no instructor. */
  instructorId: z.string().optional(),
});
export type ModuleInput = z.input<typeof moduleSchema>;

export const sessionSchema = z.object({
  title: z.string().trim().min(3).max(SESSION_TITLE_MAX_LENGTH),
  startsAt: z.iso.datetime({ message: 'Pick a date and time' }),
  durationMin: z.coerce
    .number()
    .int()
    .min(SESSION_MIN_DURATION_MIN)
    .max(SESSION_MAX_DURATION_MIN)
    .default(SESSION_DEFAULT_DURATION_MIN),
  meetUrl: z
    .string()
    .trim()
    .regex(MEET_URL_PATTERN, 'Use a Google Meet link, e.g. https://meet.google.com/abc-defg-hij'),
});
export type SessionInput = z.input<typeof sessionSchema>;

export const materialLinkSchema = z.object({
  title: z.string().trim().min(2).max(MATERIAL_TITLE_MAX_LENGTH),
  url: z.url('Enter a full URL (https://…)').max(URL_MAX_LENGTH),
});
export type MaterialLinkInput = z.infer<typeof materialLinkSchema>;

export const attendanceSchema = z.object({
  records: z.array(z.object({ userId: z.string().min(1), present: z.boolean() })).max(500),
});
export type AttendanceInput = z.infer<typeof attendanceSchema>;
