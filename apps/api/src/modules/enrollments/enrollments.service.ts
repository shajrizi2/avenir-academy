import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const enrollmentSelect = {
  id: true,
  status: true,
  createdAt: true,
  decidedAt: true,
  course: { select: { id: true, slug: true, title: true, summary: true } },
} as const satisfies Prisma.EnrollmentSelect;

export type EnrollmentRecord = Prisma.EnrollmentGetPayload<{ select: typeof enrollmentSelect }>;

/**
 * Student side of enrollment (Sprint 1). Admin approval, which creates the ModuleProgress
 * rows, arrives in Sprint 2.
 */
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
}
