import { z } from 'zod';
import { ROLES } from '../enums.js';
import { nameSchema, phoneSchema } from './auth.js';

export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const updateRoleSchema = z.object({ role: z.enum(ROLES) });
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
