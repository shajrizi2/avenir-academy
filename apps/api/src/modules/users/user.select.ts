import type { Prisma } from '../../generated/prisma/client.js';

/** The only user fields that may leave the API. Never includes passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  avatarUrl: true,
  title: true,
  bio: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** Instructor fields safe to show publicly on the landing page (no email or phone). */
export const publicInstructorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  title: true,
  bio: true,
} as const satisfies Prisma.UserSelect;

export type PublicInstructorRecord = Prisma.UserGetPayload<{
  select: typeof publicInstructorSelect;
}>;
