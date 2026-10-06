import type { Paginated } from '@ai-academy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import {
  publicInstructorSelect,
  type PublicInstructorRecord,
  publicUserSelect,
  type PublicUserRecord,
} from './user.select.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PublicUserRecord> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        title: dto.title,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
      select: publicUserSelect,
    });
  }

  async list(query: ListUsersQueryDto): Promise<Paginated<PublicUserRecord>> {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      ...(query.q && {
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { lastName: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Instructors for the public landing page, alphabetically. */
  listInstructors(): Promise<PublicInstructorRecord[]> {
    return this.prisma.user.findMany({
      where: { role: Role.INSTRUCTOR },
      select: publicInstructorSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async updateRole(actorId: string, userId: string, role: Role): Promise<PublicUserRecord> {
    if (actorId === userId && role !== Role.ADMIN) {
      throw new BadRequestException('You cannot remove your own admin role');
    }
    await this.findById(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: publicUserSelect,
    });
  }
}
