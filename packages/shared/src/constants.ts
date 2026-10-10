/** Validation limits shared by the web zod schemas and the API class-validator DTOs. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt only uses the first 72 bytes
export const NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 30;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TITLE_MAX_LENGTH = 80;
export const BIO_MAX_LENGTH = 280;
export const URL_MAX_LENGTH = 500;
export const PHONE_PATTERN = /^\+?[0-9 ()-]{6,30}$/;

/** Test defaults (editable per test). */
export const TEST_DEFAULTS = {
  passMark: 70,
  timeLimitMin: 45,
  maxAttempts: 2,
} as const;

export const MODULE_DEFAULT_DURATION_WEEKS = 4;
export const SESSION_DEFAULT_DURATION_MIN = 90;
/** The "Join on Google Meet" button becomes active this many minutes before start. */
export const SESSION_JOIN_WINDOW_MIN = 15;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Languages of the public marketing site. Albanian is the primary language. */
export const LOCALES = ['sq', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'sq';
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Modules and live sessions (Sprint 2). */
export const MODULE_TITLE_MAX_LENGTH = 120;
export const MODULE_DESCRIPTION_MAX_LENGTH = 2000;
export const MODULE_MAX_DURATION_WEEKS = 12;
export const SESSION_TITLE_MAX_LENGTH = 120;
export const SESSION_MIN_DURATION_MIN = 15;
export const SESSION_MAX_DURATION_MIN = 480;
/** Classes run on Google Meet only: https://meet.google.com/abc-defg-hij (query string allowed). */
export const MEET_URL_PATTERN = /^https:\/\/meet\.google\.com\/[a-z0-9-]+(?:\?\S*)?$/i;
export const ENROLLMENT_NOTE_MAX_LENGTH = 500;

/** Materials: links or uploaded files, stored on the API server (see docs/PLAN.md D15). */
export const MATERIAL_TITLE_MAX_LENGTH = 120;
export const MATERIAL_MAX_BYTES = 20 * 1024 * 1024;
export const MATERIAL_FILE_EXTENSIONS = [
  'pdf',
  'docx',
  'pptx',
  'xlsx',
  'csv',
  'txt',
  'md',
  'zip',
  'ipynb',
  'png',
  'jpg',
  'jpeg',
] as const;

/** Testimonials (admin-managed, real quotes only). */
export const TESTIMONIAL_QUOTE_MAX_LENGTH = 600;
export const TESTIMONIAL_ROLE_MAX_LENGTH = 80;
