import { z } from 'zod';
import {
  LOCALES,
  NAME_MAX_LENGTH,
  PHONE_PATTERN,
  TESTIMONIAL_QUOTE_MAX_LENGTH,
  TESTIMONIAL_ROLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../constants.js';
import { currencySchema, tooLong, tooShort } from './course.js';

/** Empty string means "clear this field". */
const optionalText = (max: number) => z.string().trim().max(max, tooLong(max)).optional();

const optionalUrl = z
  .union([z.literal(''), z.url('Shkruaj një URL të plotë (https://…)').max(URL_MAX_LENGTH)])
  .optional();

export const testimonialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, tooShort(2))
    .max(NAME_MAX_LENGTH * 2, tooLong(NAME_MAX_LENGTH * 2)),
  role: optionalText(TESTIMONIAL_ROLE_MAX_LENGTH),
  quote: z
    .string()
    .trim()
    .min(10, tooShort(10))
    .max(TESTIMONIAL_QUOTE_MAX_LENGTH, tooLong(TESTIMONIAL_QUOTE_MAX_LENGTH)),
  avatarUrl: optionalUrl,
  locale: z.enum(LOCALES),
  isPublished: z.boolean(),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;

/** IBAN: 2 letters, 2 digits, then 11–30 alphanumerics; spaces allowed in the input. */
export const ibanSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, '').toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, 'Shkruaj një IBAN të vlefshëm'));

/** The admin site settings form. Empty strings clear a value. */
export const siteSettingsSchema = z.object({
  /** ISO-8601 UTC, or empty. */
  nextCohortStart: z.union([z.literal(''), z.iso.datetime()]).optional(),
  scheduleSq: optionalText(120),
  scheduleEn: optionalText(120),
  seatsTotal: z.union([z.literal(''), z.coerce.number().int().min(1).max(1000)]).optional(),
  priceAmount: z.union([z.literal(''), z.coerce.number().int().min(0).max(1_000_000)]).optional(),
  priceCurrency: currencySchema,
  priceNoteSq: optionalText(120),
  priceNoteEn: optionalText(120),
  contactEmail: z
    .union([z.literal(''), z.email('Shkruaj një adresë email-i të vlefshme')])
    .optional(),
  contactPhone: z
    .union([
      z.literal(''),
      z.string().trim().regex(PHONE_PATTERN, 'Shkruaj një numër telefoni të vlefshëm'),
    ])
    .optional(),
  whatsappNumber: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^[1-9][0-9]{6,14}$/, 'Vetëm shifra, në format ndërkombëtar, pa + dhe pa hapësira'),
    ])
    .optional(),
  stripeEnabled: z.boolean().optional(),
  bankTransferEnabled: z.boolean().optional(),
  bankBeneficiary: optionalText(120),
  bankIban: z.union([z.literal(''), ibanSchema]).optional(),
  bankName: optionalText(120),
  bankSwift: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/, 'Shkruaj një kod SWIFT/BIC të vlefshëm'),
    ])
    .optional(),
});
export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
