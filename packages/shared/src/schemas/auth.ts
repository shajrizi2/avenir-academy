import { z } from 'zod';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_PATTERN,
} from '../constants.js';

// Validation messages are in Albanian: the platform is Albanian only.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, `Përdor më së shumti ${EMAIL_MAX_LENGTH} karaktere`)
  .pipe(z.email('Shkruaj një adresë email-i të vlefshme'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Përdor të paktën ${PASSWORD_MIN_LENGTH} karaktere`)
  .max(PASSWORD_MAX_LENGTH, `Përdor më së shumti ${PASSWORD_MAX_LENGTH} karaktere`)
  .regex(/[A-Za-z]/, 'Përfshi të paktën një shkronjë')
  .regex(/[0-9]/, 'Përfshi të paktën një numër');

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'E detyrueshme')
  .max(NAME_MAX_LENGTH, `Përdor më së shumti ${NAME_MAX_LENGTH} karaktere`);

/** Optional phone: empty string is treated as "not provided". */
export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, 'Shkruaj një numër telefoni të vlefshëm')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Web form variant with a confirmation field. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Fjalëkalimet nuk përputhen',
    path: ['confirmPassword'],
  });
export type RegisterFormInput = z.input<typeof registerFormSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Shkruaj fjalëkalimin').max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resetPasswordFormSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Fjalëkalimet nuk përputhen',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
