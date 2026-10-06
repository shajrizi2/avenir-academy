import type { Role } from '../generated/prisma/client.js';

/** The authenticated principal attached to `request.user` by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
