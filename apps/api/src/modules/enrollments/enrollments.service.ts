import type { Paginated } from '@ai-academy/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GroupsService } from '../groups/groups.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { DecideEnrollmentDto } from './dto/decide-enrollment.dto.js';
import type { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto.js';
import { activateEnrollment } from './enrollment-activation.js';

const paidSelect = {
  where: { status: PaymentStatus.CONFIRMED },
  select: { moduleId: true },
} as const;
const pendingSelect = {
  where: { status: PaymentStatus.PENDING },
  select: { moduleId: true },
} as const;

const enrollmentSelect = {
  id: true,
  status: true,
  createdAt: true,
  decidedAt: true,
  holdExpiresAt: true,
  course: {
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      priceCents: true,
      listPriceCents: true,
      currency: true,
    },
  },
  group: { select: { id: true, name: true, startDate: true } },
  payments: { ...paidSelect },
} as const satisfies Prisma.EnrollmentSelect;

type EnrollmentRow = Prisma.EnrollmentGetPayload<{ select: typeof enrollmentSelect }>;

export interface EnrollmentRecord extends Omit<EnrollmentRow, 'payments'> {
  paidModuleIds: string[];
  pendingModuleIds: string[];
}

const adminEnrollmentSelect = {
  id: true,
  status: true,
  note: true,
  createdAt: true,
  decidedAt: true,
  holdExpiresAt: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  course: { select: { id: true, slug: true, title: true } },
  group: { select: { id: true, name: true, startDate: true } },
  payments: { ...paidSelect },
} as const satisfies Prisma.EnrollmentSelect;

type AdminEnrollmentRow = Prisma.EnrollmentGetPayload<{ select: typeof adminEnrollmentSelect }>;

export interface AdminEnrollmentRecord extends Omit<AdminEnrollmentRow, 'payments'> {
  paidModuleIds: string[];
}

/** Which decisions an admin may make from each status (the legacy, no-payment flow). */
const ALLOWED_DECISIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  PENDING: [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED],
  PENDING_PAYMENT: [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED],
  WAITLISTED: [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED],
  EXPIRED: [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED],
  REJECTED: [EnrollmentStatus.APPROVED],
  APPROVED: [],
  CANCELLED: [],
};

function toAdminRecord({ payments, ...row }: AdminEnrollmentRow): AdminEnrollmentRecord {
  return { ...row, paidModuleIds: [...new Set(payments.map((p) => p.moduleId))] };
}

/**
 * Enrollments. The normal path is PaymentsService.checkout (a seat held until the first month
 * is paid); admins can still approve a request by hand, reject one, or move a waitlisted
 * student into a group.
 */
@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupsService,
    private readonly payments: PaymentsService,
  ) {}

  /** Legacy request without payment: waits for an admin. Kept for free or special seats. */
  async request(userId: string, courseId: string): Promise<EnrollmentRecord> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true },
    });
    if (!course?.isPublished) throw new NotFoundException('Kursi nuk u gjet');

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, status: true },
    });
    if (!existing) {
      const created = await this.prisma.enrollment.create({
        data: { userId, courseId },
        select: enrollmentSelect,
      });
      return this.toRecord(created);
    }
    // A student who cancelled or expired may ask again; pending/approved/rejected stand.
    if (
      existing.status === EnrollmentStatus.CANCELLED ||
      existing.status === EnrollmentStatus.EXPIRED
    ) {
      const updated = await this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.PENDING, decidedAt: null, createdAt: new Date() },
        select: enrollmentSelect,
      });
      return this.toRecord(updated);
    }
    throw new ConflictException(
      existing.status === EnrollmentStatus.REJECTED
        ? 'Kërkesa jote për këtë kurs u refuzua. Na kontakto.'
        : 'Ke tashmë një regjistrim në këtë kurs',
    );
  }

  async listForUser(userId: string): Promise<EnrollmentRecord[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: enrollmentSelect,
    });
    return Promise.all(rows.map((r) => this.toRecord(r)));
  }

  async listForAdmin(query: ListEnrollmentsQueryDto): Promise<Paginated<AdminEnrollmentRecord>> {
    const where: Prisma.EnrollmentWhereInput = {
      status: query.status,
      courseId: query.courseId,
      groupId: query.groupId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        // Oldest waiting requests first, so the queue is worked in order.
        orderBy: {
          createdAt:
            query.status === EnrollmentStatus.PENDING ||
            query.status === EnrollmentStatus.PENDING_PAYMENT ||
            query.status === EnrollmentStatus.WAITLISTED
              ? 'asc'
              : 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: adminEnrollmentSelect,
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    return { items: items.map(toAdminRecord), total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Approves or rejects by hand. Approving activates the enrollment (module 1 ACTIVE, the rest
   * LOCKED) without a payment: for free seats or payments handled outside the platform.
   */
  decide(id: string, dto: DecideEnrollmentDto): Promise<AdminEnrollmentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!enrollment) throw new NotFoundException('Regjistrimi nuk u gjet');
      if (!ALLOWED_DECISIONS[enrollment.status].includes(dto.status)) {
        throw new ConflictException('Ky regjistrim nuk mund të ndryshohet më nga statusi i tij');
      }
      const now = new Date();
      if (dto.status === EnrollmentStatus.APPROVED) {
        await activateEnrollment(tx, id, now);
        await tx.enrollment.update({ where: { id }, data: { note: dto.note } });
      } else {
        await tx.enrollment.update({
          where: { id },
          data: { status: dto.status, note: dto.note, decidedAt: now, holdExpiresAt: null },
        });
      }
      return toAdminRecord(
        await tx.enrollment.findUniqueOrThrow({ where: { id }, select: adminEnrollmentSelect }),
      );
    });
  }

  /**
   * Moves a waitlisted (or expired, cancelled) student into a group with a free seat: the
   * seat is held for 48 hours and they are emailed a link to pay.
   */
  async move(id: string, groupId: string): Promise<AdminEnrollmentRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.payments.waitlistOfferMs);
    const record = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id },
        select: { status: true, courseId: true, groupId: true },
      });
      if (!enrollment) throw new NotFoundException('Regjistrimi nuk u gjet');
      if (enrollment.status === EnrollmentStatus.APPROVED) {
        // Already enrolled: just change the group (an admin's call).
        await this.assertSameCourse(tx, groupId, enrollment.courseId);
        await tx.enrollment.update({ where: { id }, data: { groupId } });
        return { moved: false };
      }
      await this.assertSameCourse(tx, groupId, enrollment.courseId);
      const { free } = await this.groups.lockAndCountFree(tx, groupId, now);
      if (free === 0) throw new ConflictException('Ky grup nuk ka vende të lira');
      await tx.enrollment.update({
        where: { id },
        data: {
          groupId,
          status: EnrollmentStatus.PENDING_PAYMENT,
          holdExpiresAt: expiresAt,
          decidedAt: null,
        },
      });
      return { moved: true };
    });
    if (record.moved) await this.payments.sendSeatOffered(id, expiresAt);
    return toAdminRecord(
      await this.prisma.enrollment.findUniqueOrThrow({
        where: { id },
        select: adminEnrollmentSelect,
      }),
    );
  }

  private async assertSameCourse(
    tx: Prisma.TransactionClient,
    groupId: string,
    courseId: string,
  ): Promise<void> {
    const group = await tx.group.findUnique({ where: { id: groupId }, select: { courseId: true } });
    if (!group) throw new NotFoundException('Grupi nuk u gjet');
    if (group.courseId !== courseId) {
      throw new ConflictException('Grupi i përket një kursi tjetër');
    }
  }

  private async toRecord({ payments, ...row }: EnrollmentRow): Promise<EnrollmentRecord> {
    const pending = await this.prisma.payment.findMany({
      where: { enrollmentId: row.id, ...pendingSelect.where },
      select: pendingSelect.select,
    });
    return {
      ...row,
      paidModuleIds: [...new Set(payments.map((p) => p.moduleId))],
      pendingModuleIds: [...new Set(pending.map((p) => p.moduleId))],
    };
  }
}
