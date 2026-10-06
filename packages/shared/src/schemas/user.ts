import { z } from 'zod';
import { BIO_MAX_LENGTH, TITLE_MAX_LENGTH, URL_MAX_LENGTH } from '../constants.js';
import { ROLES } from '../enums.js';
import { nameSchema, phoneSchema } from './auth.js';

/** Empty string means "clear this field". */
const optionalText = (max: number) =>
  z.string().trim().max(max, `Use at most ${max} characters`).optional();

export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  // Public instructor profile (shown on the landing page for instructors).
  title: optionalText(TITLE_MAX_LENGTH),
  bio: optionalText(BIO_MAX_LENGTH),
  avatarUrl: z
    .union([z.literal(''), z.url('Enter a full URL (https://…)').max(URL_MAX_LENGTH)])
    .optional(),
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const updateRoleSchema = z.object({ role: z.enum(ROLES) });
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
