import type { Prisma } from '../../generated/prisma/client.js';

/** The only user fields that may leave the API. Never includes passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
