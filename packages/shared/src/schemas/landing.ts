import { z } from 'zod';
import {
  LOCALES,
  NAME_MAX_LENGTH,
  PHONE_PATTERN,
  TESTIMONIAL_QUOTE_MAX_LENGTH,
  TESTIMONIAL_ROLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../constants.js';

/** Empty string means "clear this field". */
const optionalText = (max: number) =>
  z.string().trim().max(max, `Use at most ${max} characters`).optional();

const optionalUrl = z
  .union([z.literal(''), z.url('Enter a full URL (https://…)').max(URL_MAX_LENGTH)])
  .optional();

export const testimonialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(NAME_MAX_LENGTH * 2),
  role: optionalText(TESTIMONIAL_ROLE_MAX_LENGTH),
  quote: z.string().trim().min(10).max(TESTIMONIAL_QUOTE_MAX_LENGTH),
  avatarUrl: optionalUrl,
  locale: z.enum(LOCALES),
  isPublished: z.boolean(),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;

/** The admin site settings form. Empty strings clear a value. */
export const siteSettingsSchema = z.object({
  /** ISO-8601 UTC, or empty. */
  nextCohortStart: z.union([z.literal(''), z.iso.datetime()]).optional(),
  scheduleSq: optionalText(120),
  scheduleEn: optionalText(120),
  seatsTotal: z.union([z.literal(''), z.coerce.number().int().min(1).max(1000)]).optional(),
  priceAmount: z.union([z.literal(''), z.coerce.number().int().min(0).max(1_000_000)]).optional(),
  priceCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use an ISO 4217 code such as EUR'),
  priceNoteSq: optionalText(120),
  priceNoteEn: optionalText(120),
  contactEmail: z.union([z.literal(''), z.email('Enter a valid email address')]).optional(),
  contactPhone: z
    .union([z.literal(''), z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number')])
    .optional(),
  whatsappNumber: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^[1-9][0-9]{6,14}$/, 'Digits in international format, without + or spaces'),
    ])
    .optional(),
});
export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
