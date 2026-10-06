import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given roles (checked by RolesGuard after authentication). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
