import type { Paginated } from '@ai-academy/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, ModuleStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { DecideEnrollmentDto } from './dto/decide-enrollment.dto.js';
import type { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto.js';

const enrollmentSelect = {
  id: true,
  status: true,
  createdAt: true,
  decidedAt: true,
  course: { select: { id: true, slug: true, title: true, summary: true } },
} as const satisfies Prisma.EnrollmentSelect;

export type EnrollmentRecord = Prisma.EnrollmentGetPayload<{ select: typeof enrollmentSelect }>;

const adminEnrollmentSelect = {
  id: true,
  status: true,
  note: true,
  createdAt: true,
  decidedAt: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  course: { select: { id: true, slug: true, title: true } },
} as const satisfies Prisma.EnrollmentSelect;

export type AdminEnrollmentRecord = Prisma.EnrollmentGetPayload<{
  select: typeof adminEnrollmentSelect;
}>;

/** Which decisions an admin may make from each status. */
const ALLOWED_DECISIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  PENDING: [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED],
  REJECTED: [EnrollmentStatus.APPROVED],
  APPROVED: [],
  CANCELLED: [],
};

/** Students request a place; admins approve (which opens module 1) or reject. */
@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async request(userId: string, courseId: string): Promise<EnrollmentRecord> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true },
    });
    if (!course?.isPublished) throw new NotFoundException('Course not found');

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, status: true },
    });
    if (!existing) {
      return this.prisma.enrollment.create({
        data: { userId, courseId },
        select: enrollmentSelect,
      });
    }
    // A student who cancelled may ask again; pending/approved/rejected requests stand.
    if (existing.status === EnrollmentStatus.CANCELLED) {
      return this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.PENDING, decidedAt: null, createdAt: new Date() },
        select: enrollmentSelect,
      });
    }
    throw new ConflictException(
      existing.status === EnrollmentStatus.REJECTED
        ? 'Your enrollment request for this course was declined. Please contact us.'
        : 'You have already requested enrollment in this course',
    );
  }

  listForUser(userId: string): Promise<EnrollmentRecord[]> {
    return this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: enrollmentSelect,
    });
  }

  async listForAdmin(query: ListEnrollmentsQueryDto): Promise<Paginated<AdminEnrollmentRecord>> {
    const where: Prisma.EnrollmentWhereInput = { status: query.status, courseId: query.courseId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        // Oldest pending requests first, so the queue is worked in order.
        orderBy: { createdAt: query.status === EnrollmentStatus.PENDING ? 'asc' : 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: adminEnrollmentSelect,
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Approves or rejects a request. Approving creates one ModuleProgress row per module in the
   * same transaction: module 1 ACTIVE, the rest LOCKED (existing rows are kept).
   */
  decide(id: string, dto: DecideEnrollmentDto): Promise<AdminEnrollmentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id },
        select: { status: true, userId: true, courseId: true },
      });
      if (!enrollment) throw new NotFoundException('Enrollment not found');
      if (!ALLOWED_DECISIONS[enrollment.status].includes(dto.status)) {
        throw new ConflictException(
          `This request is ${enrollment.status.toLowerCase()} and can't be ${dto.status.toLowerCase()}`,
        );
      }

      const now = new Date();
      const updated = await tx.enrollment.update({
        where: { id },
        data: { status: dto.status, note: dto.note, decidedAt: now },
        select: adminEnrollmentSelect,
      });

      if (dto.status === EnrollmentStatus.APPROVED) {
        const modules = await tx.module.findMany({
          where: { courseId: enrollment.courseId },
          orderBy: { order: 'asc' },
          select: { id: true },
        });
        await tx.moduleProgress.createMany({
          data: modules.map((module, index) => ({
            userId: enrollment.userId,
            moduleId: module.id,
            status: index === 0 ? ModuleStatus.ACTIVE : ModuleStatus.LOCKED,
            unlockedAt: index === 0 ? now : null,
          })),
          skipDuplicates: true,
        });
      }
      return updated;
    });
  }
}
