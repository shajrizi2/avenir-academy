import { z } from 'zod';
import { MAX_PRICE_CENTS, SLUG_PATTERN } from '../constants.js';

/** Shared Albanian messages for length rules. */
export const tooShort = (min: number) => `Përdor të paktën ${min} karaktere`;
export const tooLong = (max: number) => `Përdor më së shumti ${max} karaktere`;

/** An optional translation: empty means "not translated" (falls back to English). */
export const optionalTranslation = (min: number, max: number) =>
  z
    .union([z.literal(''), z.string().trim().min(min, tooShort(min)).max(max, tooLong(max))])
    .optional();

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Përdor një kod ISO 4217, p.sh. EUR');

export const courseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, tooShort(3))
    .max(80, tooLong(80))
    .regex(SLUG_PATTERN, 'Përdor shkronja të vogla, numra dhe viza'),
  title: z.string().trim().min(3, tooShort(3)).max(120, tooLong(120)),
  summary: z.string().trim().min(10, tooShort(10)).max(300, tooLong(300)),
  description: z.string().trim().min(10, tooShort(10)).max(10_000, tooLong(10_000)),
  titleSq: optionalTranslation(3, 120),
  summarySq: optionalTranslation(10, 300),
  descriptionSq: optionalTranslation(10, 10_000),
  coverUrl: z.url('Shkruaj një URL të plotë (https://…)').max(500).optional(),
  startDate: z.iso.datetime().optional(),
  isPublished: z.boolean().optional(),
  /** Per month, in cents. */
  priceCents: z.coerce.number().int().min(0).max(MAX_PRICE_CENTS).optional(),
  /** Empty string clears the standard (struck-through) price. */
  listPriceCents: z
    .union([z.literal(''), z.coerce.number().int().min(0).max(MAX_PRICE_CENTS)])
    .optional(),
  currency: currencySchema.optional(),
});
export type CourseInput = z.infer<typeof courseSchema>;
