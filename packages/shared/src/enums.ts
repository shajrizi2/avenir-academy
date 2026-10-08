// Mirrors the Prisma enums in apps/api/prisma/schema.prisma. Keep them in sync.

export const Role = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role);

export const EnrollmentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
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
