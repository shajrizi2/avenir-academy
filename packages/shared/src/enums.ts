// Mirrors the Prisma enums in apps/api/prisma/schema.prisma. Keep them in sync.

export const Role = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role);

/**
 * PENDING: waiting for an admin (legacy, no payment). PENDING_PAYMENT: a seat is held until the
 * first month is paid. APPROVED: enrolled. WAITLISTED: the group was full. EXPIRED: the hold
 * ran out unpaid.
 */
export const EnrollmentStatus = {
  PENDING: 'PENDING',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  WAITLISTED: 'WAITLISTED',
  EXPIRED: 'EXPIRED',
} as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export const ModuleStatus = {
  LOCKED: 'LOCKED',
  ACTIVE: 'ACTIVE',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
} as const;
export type ModuleStatus = (typeof ModuleStatus)[keyof typeof ModuleStatus];

export const QuestionType = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTI_CHOICE: 'MULTI_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

/** Stored in Material.kind (a plain string column). */
export const MaterialKind = {
  LINK: 'LINK',
  FILE: 'FILE',
} as const;
export type MaterialKind = (typeof MaterialKind)[keyof typeof MaterialKind];

export const GroupStatus = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  RUNNING: 'RUNNING',
  FINISHED: 'FINISHED',
} as const;
export type GroupStatus = (typeof GroupStatus)[keyof typeof GroupStatus];

export const PaymentMethod = {
  STRIPE: 'STRIPE',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHODS = Object.values(PaymentMethod);

export const PaymentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export const PAYMENT_STATUSES = Object.values(PaymentStatus);

export const EmailType = {
  PASSWORD_RESET: 'PASSWORD_RESET',
  REGISTRATION_CONFIRMED: 'REGISTRATION_CONFIRMED',
  LECTURE_REMINDER_24H: 'LECTURE_REMINDER_24H',
  LECTURE_REMINDER_1H: 'LECTURE_REMINDER_1H',
  OFFLINE_LEARNING: 'OFFLINE_LEARNING',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  HOLD_EXPIRING: 'HOLD_EXPIRING',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  REFUND_ISSUED: 'REFUND_ISSUED',
  WAITLIST_JOINED: 'WAITLIST_JOINED',
  SEAT_OFFERED: 'SEAT_OFFERED',
} as const;
export type EmailType = (typeof EmailType)[keyof typeof EmailType];
export const EMAIL_TYPES = Object.values(EmailType);

export const EmailStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];
