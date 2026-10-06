/** Validation limits shared by the web zod schemas and the API class-validator DTOs. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt only uses the first 72 bytes
export const NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 30;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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
