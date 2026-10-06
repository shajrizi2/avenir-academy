import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { CoursesService } from './courses.service.js';

const course = {
  id: 'course_1',
  slug: 'ai-foundations',
  title: 'AI Foundations',
  summary: 'Summary',
  coverUrl: null,
  startDate: null,
  isPublished: true,
};

describe('CoursesService', () => {
  let prisma: {
    course: Record<
      'findMany' | 'findUnique' | 'create' | 'update' | 'delete',
      ReturnType<typeof vi.fn>
    >;
  };
  let service: CoursesService;

  beforeEach(() => {
    prisma = {
      course: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new CoursesService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('returns only published courses with a module count', async () => {
      prisma.course.findMany.mockResolvedValue([{ ...course, _count: { modules: 4 } }]);

      const result = await service.list();

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
      expect(result).toEqual([{ ...course, moduleCount: 4 }]);
    });

    it('includes unpublished courses when asked', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      await service.list(true);
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findBySlug', () => {
    it('returns a published course with its ordered modules', async () => {
      const detail = { ...course, description: 'Long', modules: [] };
      prisma.course.findUnique.mockResolvedValue(detail);

      await expect(service.findBySlug('ai-foundations')).resolves.toEqual(detail);
      const args = prisma.course.findUnique.mock.calls[0][0] as {
        select: { modules: { orderBy: unknown } };
      };
      expect(args.select.modules.orderBy).toEqual({ order: 'asc' });
    });

    it('hides unpublished courses from the public', async () => {
      prisma.course.findUnique.mockResolvedValue({ ...course, isPublished: false, modules: [] });
      await expect(service.findBySlug('ai-foundations')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('shows unpublished courses to admins', async () => {
      prisma.course.findUnique.mockResolvedValue({ ...course, isPublished: false, modules: [] });
      await expect(service.findBySlug('ai-foundations', true)).resolves.toMatchObject({
        isPublished: false,
      });
    });

    it('throws 404 for an unknown slug', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create / update', () => {
    it('converts the ISO start date to a Date', async () => {
      prisma.course.create.mockResolvedValue(course);
      await service.create({
        slug: 'new-course',
        title: 'New course',
        summary: 'A short summary',
        description: 'A longer description',
        startDate: '2026-11-01T09:00:00.000Z',
      });
      const { data } = prisma.course.create.mock.calls[0][0] as { data: { startDate: Date } };
      expect(data.startDate).toEqual(new Date('2026-11-01T09:00:00.000Z'));
    });

    it('throws 404 when updating a missing course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.course.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing course', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'course_1' });
      await service.remove('course_1');
      expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 'course_1' } });
    });

    it('refuses to delete a course that has enrollments', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'course_1' });
      prisma.course.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );
      await expect(service.remove('course_1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
