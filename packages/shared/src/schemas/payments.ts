import { z } from 'zod';
import { ENROLLMENT_NOTE_MAX_LENGTH } from '../constants.js';
import { PAYMENT_METHODS } from '../enums.js';
import { tooLong } from './course.js';

/** Student: start paying the first month of a group (the seat is held meanwhile). */
export const checkoutSchema = z.object({
  groupId: z.string().min(1, 'Zgjidh një grup'),
  provider: z.enum(PAYMENT_METHODS, { message: 'Zgjidh mënyrën e pagesës' }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Student: pay a later month of an existing enrollment. */
export const payModuleSchema = z.object({
  moduleId: z.string().min(1),
  provider: z.enum(PAYMENT_METHODS, { message: 'Zgjidh mënyrën e pagesës' }),
});
export type PayModuleInput = z.infer<typeof payModuleSchema>;

/** Admin: confirm, reject or refund with an optional internal note. */
export const paymentNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(ENROLLMENT_NOTE_MAX_LENGTH, tooLong(ENROLLMENT_NOTE_MAX_LENGTH))
    .optional(),
});
export type PaymentNoteInput = z.infer<typeof paymentNoteSchema>;

/** Admin: record a payment received outside the platform (cash, a transfer without reference). */
export const manualPaymentSchema = z.object({
  enrollmentId: z.string().min(1),
  moduleId: z.string().min(1),
  note: z
    .string()
    .trim()
    .max(ENROLLMENT_NOTE_MAX_LENGTH, tooLong(ENROLLMENT_NOTE_MAX_LENGTH))
    .optional(),
});
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;
