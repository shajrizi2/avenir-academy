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
export const SESSION_DEFAULT_DURATION_MIN = 120;
/** The "Join on Google Meet" button becomes active this many minutes before start. */
export const SESSION_JOIN_WINDOW_MIN = 15;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Content languages known to the platform (testimonials carry one). The public site itself
 * is Albanian only: `ACTIVE_LOCALES`. English copy stays in the repo for later.
 */
export const LOCALES = ['sq', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'sq';
export const ACTIVE_LOCALES = ['sq'] as const satisfies readonly Locale[];
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
export function isActiveLocale(value: unknown): value is (typeof ACTIVE_LOCALES)[number] {
  return typeof value === 'string' && (ACTIVE_LOCALES as readonly string[]).includes(value);
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

/** Tests and attempts (Sprint 3). Defaults are in TEST_DEFAULTS. */
export const TEST_TITLE_MAX_LENGTH = 120;
export const TEST_MIN_TIME_LIMIT_MIN = 5;
export const TEST_MAX_TIME_LIMIT_MIN = 240;
export const TEST_MAX_ATTEMPTS = 10;
export const TEST_MAX_QUESTIONS = 100;
export const QUESTION_TEXT_MAX_LENGTH = 1000;
export const QUESTION_MAX_POINTS = 10;
export const QUESTION_MIN_OPTIONS = 2;
export const QUESTION_MAX_OPTIONS = 8;
export const OPTION_TEXT_MAX_LENGTH = 300;
/** The default test window is the module's last week. */
export const TEST_WINDOW_DAYS = 7;
/** Autosaves and submissions are still accepted this long after the deadline (network lag). */
export const ATTEMPT_GRACE_SEC = 30;

/** Groups (cohorts), schedule and seat holds. */
export const DEFAULT_TIMEZONE = 'Europe/Tirane';
export const GROUP_MAX_CAPACITY = 10;
export const GROUP_DEFAULT_CAPACITY = 10;
export const GROUP_NAME_MAX_LENGTH = 80;
/** A month of a course = one module = 12 live lectures of 2 hours, 3 per week. */
export const SESSIONS_PER_MODULE = 12;
export const LECTURES_PER_WEEK = 3;
export const LECTURE_DURATION_MIN = 120;
export const LECTURE_HOURS_PER_MONTH = (SESSIONS_PER_MODULE * LECTURE_DURATION_MIN) / 60;
/** "HH:mm", 24-hour. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
/** How long a seat is held while a first-month payment is pending. */
export const HOLD_STRIPE_MIN = 30;
export const HOLD_BANK_HOURS = 48;
/** The "your hold is about to expire" email goes out this long before a bank hold ends. */
export const HOLD_EXPIRING_WARNING_HOURS = 12;
/** A seat offered to someone on the waitlist is held this long. */
export const WAITLIST_OFFER_HOURS = 48;

/** Prices are stored in minor units (cents) on the course. */
export const DEFAULT_PRICE_CENTS = 8900;
export const DEFAULT_LIST_PRICE_CENTS = 15000;
export const DEFAULT_CURRENCY = 'EUR';
export const MAX_PRICE_CENTS = 100_000_000;
/** Bank-transfer references: "AV-" + 8 characters. */
export const PAYMENT_REFERENCE_PATTERN = /^[A-Z]{2,4}-[A-Z0-9]{6,12}$/;

/** Offline lessons. */
export const LESSON_TITLE_MAX_LENGTH = 160;
export const LESSON_CONTENT_MAX_LENGTH = 60_000;
export const LESSON_MAX_MINUTES = 600;
/** YouTube and Vimeo page or embed URLs. */
export const VIDEO_URL_PATTERN =
  /^https:\/\/(?:(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|shorts\/)[\w-]{6,}(?:[&?#]\S*)?|youtu\.be\/[\w-]{6,}(?:[?#]\S*)?|(?:www\.)?vimeo\.com\/(?:video\/)?\d{5,}(?:[/?#]\S*)?|player\.vimeo\.com\/video\/\d{5,}(?:[?#]\S*)?)$/i;

/** Albanian calendar names (browsers ship no Albanian Intl data). January and Sunday first. */
export const SQ_MONTHS = [
  'janar',
  'shkurt',
  'mars',
  'prill',
  'maj',
  'qershor',
  'korrik',
  'gusht',
  'shtator',
  'tetor',
  'nëntor',
  'dhjetor',
] as const;
export const SQ_WEEKDAYS = [
  'e diel',
  'e hënë',
  'e martë',
  'e mërkurë',
  'e enjte',
  'e premte',
  'e shtunë',
] as const;
/** Short weekday labels for schedules, Sunday first: "Hën, Mër, Pre". */
export const SQ_WEEKDAYS_SHORT = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'] as const;
