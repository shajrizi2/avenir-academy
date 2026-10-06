import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let prisma: { user: Record<'findMany' | 'findUnique' | 'update', ReturnType<typeof vi.fn>> };
  let service: UsersService;

  beforeEach(() => {
    prisma = { user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() } };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('lists only instructors, without contact details or password hashes', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await service.listInstructors();

    const args = prisma.user.findMany.mock.calls[0][0] as {
      where: unknown;
      select: Record<string, boolean>;
    };
    expect(args.where).toEqual({ role: 'INSTRUCTOR' });
    expect(Object.keys(args.select).sort()).toEqual(
      ['avatarUrl', 'bio', 'firstName', 'id', 'lastName', 'title'].sort(),
    );
  });

  it('prevents admins from removing their own admin role', async () => {
    await expect(service.updateRole('admin_1', 'admin_1', 'STUDENT')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
