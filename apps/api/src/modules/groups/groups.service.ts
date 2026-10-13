import {
  generateSessionTimes,
  localDateKey,
  SESSIONS_PER_MODULE,
  WAITLIST_OFFER_HOURS,
} from '@ai-academy/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import {
  EnrollmentStatus,
  GroupStatus,
  PaymentStatus,
  type Prisma,
  Role,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateGroupDto } from './dto/create-group.dto.js';
import type { UpdateGroupDto } from './dto/update-group.dto.js';

type Tx = Prisma.TransactionClient;

const groupSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  weekdays: true,
  startTime: true,
  durationMin: true,
  timezone: true,
  capacity: true,
  status: true,
  meetUrl: true,
  offlineEmailDays: true,
  createdAt: true,
  course: { select: { id: true, slug: true, title: true } },
  instructor: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { sessions: true } },
} as const satisfies Prisma.GroupSelect;

type GroupRow = Prisma.GroupGetPayload<{ select: typeof groupSelect }>;

export interface GroupSummaryRecord {
  id: string;
  name: string;
  course: { id: string; slug: string; title: string };
  startDate: string;
  endDate: string;
  weekdays: number[];
  startTime: string;
  durationMin: number;
  timezone: string;
  capacity: number;
  seatsLeft: number;
  status: GroupStatus;
  instructor: { id: string; firstName: string; lastName: string } | null;
}

export interface AdminGroupRecord extends GroupSummaryRecord {
  meetUrl: string | null;
  offlineEmailDays: number[];
  enrolledCount: number;
  heldCount: number;
  waitlistedCount: number;
  sessionCount: number;
  createdAt: Date;
}

export interface GroupStudentRecord {
  enrollmentId: string;
  status: EnrollmentStatus;
  user: { id: string; firstName: string; lastName: string; email: string };
  holdExpiresAt: Date | null;
  paidModuleIds: string[];
  createdAt: Date;
}

/** A @db.Date column comes back as midnight UTC; the key is its calendar day. */
export function dateKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Cohorts: at most `capacity` students per group. A seat is taken by an APPROVED enrollment
 * or by an active hold (PENDING_PAYMENT with holdExpiresAt in the future). Counting always
 * happens with the group row locked, so two checkouts can't both take the last seat.
 */
@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Groups students can still join or see: open, full or running, newest start first. */
  async listPublic(courseId?: string): Promise<GroupSummaryRecord[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        courseId,
        status: { in: [GroupStatus.OPEN, GroupStatus.FULL] },
        course: { isPublished: true },
      },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
      select: groupSelect,
    });
    const taken = await this.seatsTakenByGroup(groups.map((g) => g.id));
    return groups.map((g) => this.toSummary(g, taken.get(g.id) ?? 0));
  }

  async findPublic(id: string): Promise<GroupSummaryRecord> {
    const group = await this.prisma.group.findUnique({ where: { id }, select: groupSelect });
    if (!group || !(await this.isVisible(group.course.id))) {
      throw new NotFoundException('Grupi nuk u gjet');
    }
    const taken = await this.seatsTakenByGroup([id]);
    return this.toSummary(group, taken.get(id) ?? 0);
  }

  /** Every group of every course, with the counts admins need. */
  async listForStaff(user: AuthUser, courseId?: string): Promise<AdminGroupRecord[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        courseId,
        ...(user.role === Role.INSTRUCTOR && { instructorId: user.id }),
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      select: groupSelect,
    });
    return Promise.all(groups.map((g) => this.toAdmin(g)));
  }

  async findForAdmin(id: string): Promise<AdminGroupRecord> {
    const group = await this.prisma.group.findUnique({ where: { id }, select: groupSelect });
    if (!group) throw new NotFoundException('Grupi nuk u gjet');
    return this.toAdmin(group);
  }

  async create(courseId: string, dto: CreateGroupDto): Promise<AdminGroupRecord> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, _count: { select: { modules: true } } },
    });
    if (!course) throw new NotFoundException('Kursi nuk u gjet');
    if (course._count.modules === 0) {
      throw new BadRequestException('Shto modulet e kursit para se të krijosh një grup');
    }
    await this.assertInstructor(dto.instructorId);

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          courseId,
          name: dto.name,
          startDate: new Date(`${dto.startDate}T00:00:00Z`),
          endDate: new Date(`${dto.startDate}T00:00:00Z`),
          weekdays: [...new Set(dto.weekdays)].sort(),
          startTime: dto.startTime,
          durationMin: dto.durationMin,
          timezone: dto.timezone,
          capacity: dto.capacity,
          status: dto.status ?? GroupStatus.OPEN,
          instructorId: dto.instructorId ?? null,
          meetUrl: dto.meetUrl ?? null,
          ...(dto.offlineEmailDays && { offlineEmailDays: [...new Set(dto.offlineEmailDays)] }),
        },
        select: { id: true },
      });
      await this.generateSessions(tx, created.id, false);
      return tx.group.findUniqueOrThrow({ where: { id: created.id }, select: groupSelect });
    });
    return this.toAdmin(group);
  }

  async update(id: string, dto: UpdateGroupDto): Promise<AdminGroupRecord> {
    const current = await this.prisma.group.findUnique({
      where: { id },
      select: { id: true, capacity: true },
    });
    if (!current) throw new NotFoundException('Grupi nuk u gjet');
    if (dto.instructorId !== undefined) await this.assertInstructor(dto.instructorId);
    if (dto.capacity !== undefined && dto.capacity < current.capacity) {
      const taken = (await this.seatsTakenByGroup([id])).get(id) ?? 0;
      if (dto.capacity < taken) {
        throw new ConflictException(
          `Grupi ka tashmë ${taken} vende të zëna; kapaciteti nuk mund të jetë më i vogël`,
        );
      }
    }
    const scheduleChanged =
      dto.startDate !== undefined ||
      dto.weekdays !== undefined ||
      dto.startTime !== undefined ||
      dto.durationMin !== undefined ||
      dto.timezone !== undefined;

    const group = await this.prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id },
        data: {
          name: dto.name,
          startDate: dto.startDate ? new Date(`${dto.startDate}T00:00:00Z`) : undefined,
          weekdays: dto.weekdays ? [...new Set(dto.weekdays)].sort() : undefined,
          startTime: dto.startTime,
          durationMin: dto.durationMin,
          timezone: dto.timezone,
          capacity: dto.capacity,
          status: dto.status,
          instructorId: dto.instructorId,
          meetUrl: dto.meetUrl,
          offlineEmailDays: dto.offlineEmailDays
            ? [...new Set(dto.offlineEmailDays)].sort()
            : undefined,
        },
      });
      if (scheduleChanged) await this.generateSessions(tx, id, true);
      else if (dto.meetUrl) {
        // A new default link applies to the lectures that haven't happened yet.
        await tx.liveSession.updateMany({
          where: { groupId: id, startsAt: { gt: new Date() } },
          data: { meetUrl: dto.meetUrl },
        });
      }
      return tx.group.findUniqueOrThrow({ where: { id }, select: groupSelect });
    });
    return this.toAdmin(group);
  }

  /** Rebuilds the future sessions from the schedule (past ones, and ones with attendance, stay). */
  async regenerateSessions(id: string): Promise<AdminGroupRecord> {
    await this.findForAdmin(id);
    const group = await this.prisma.$transaction(async (tx) => {
      await this.generateSessions(tx, id, true);
      return tx.group.findUniqueOrThrow({ where: { id }, select: groupSelect });
    });
    return this.toAdmin(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { _count: { select: { enrollments: true } } },
    });
    if (!group) throw new NotFoundException('Grupi nuk u gjet');
    if (group._count.enrollments > 0) {
      throw new ConflictException('Grupi ka studentë dhe nuk mund të fshihet');
    }
    await this.prisma.group.delete({ where: { id } });
  }

  /** The admin's roster of a group: every enrollment, with payments. */
  async students(user: AuthUser, id: string): Promise<GroupStudentRecord[]> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { instructorId: true },
    });
    if (!group) throw new NotFoundException('Grupi nuk u gjet');
    if (user.role === Role.INSTRUCTOR && group.instructorId !== user.id) {
      throw new NotFoundException('Grupi nuk u gjet');
    }
    const rows = await this.prisma.enrollment.findMany({
      where: { groupId: id },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        status: true,
        holdExpiresAt: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        payments: { where: { status: PaymentStatus.CONFIRMED }, select: { moduleId: true } },
      },
    });
    return rows.map(({ id: enrollmentId, payments, ...r }) => ({
      enrollmentId,
      ...r,
      paidModuleIds: [...new Set(payments.map((p) => p.moduleId))],
    }));
  }

  // ---- Seats ----

  /**
   * Locks the group row and returns how many seats are free. Must run inside the transaction
   * that then takes a seat, so concurrent checkouts queue up behind each other.
   */
  async lockAndCountFree(
    tx: Tx,
    groupId: string,
    now = new Date(),
  ): Promise<{ free: number; capacity: number }> {
    const rows = await tx.$queryRaw<{ id: string; capacity: number }[]>`
      SELECT "id", "capacity" FROM "Group" WHERE "id" = ${groupId} FOR UPDATE`;
    const group = rows[0];
    if (!group) throw new NotFoundException('Grupi nuk u gjet');
    const taken = await tx.enrollment.count({
      where: {
        groupId,
        OR: [
          { status: EnrollmentStatus.APPROVED },
          { status: EnrollmentStatus.PENDING_PAYMENT, holdExpiresAt: { gt: now } },
        ],
      },
    });
    return { free: Math.max(0, group.capacity - taken), capacity: group.capacity };
  }

  async seatsTakenByGroup(groupIds: string[], now = new Date()): Promise<Map<string, number>> {
    if (groupIds.length === 0) return new Map();
    const rows = await this.prisma.enrollment.groupBy({
      by: ['groupId'],
      where: {
        groupId: { in: groupIds },
        OR: [
          { status: EnrollmentStatus.APPROVED },
          { status: EnrollmentStatus.PENDING_PAYMENT, holdExpiresAt: { gt: now } },
        ],
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.groupId as string, r._count._all]));
  }

  /** Seats the waitlist offer holds, in hours (so the payments module shares one number). */
  readonly waitlistOfferHours = WAITLIST_OFFER_HOURS;

  // ---- Sessions ----

  /**
   * 12 sessions per module on the group's weekdays, the first on or after the start date.
   * With `replace`, future sessions without attendance are deleted first and only the
   * missing ones are added, so past lectures and attendance records are never touched.
   */
  private async generateSessions(tx: Tx, groupId: string, replace: boolean): Promise<void> {
    const group = await tx.group.findUniqueOrThrow({
      where: { id: groupId },
      select: {
        startDate: true,
        weekdays: true,
        startTime: true,
        durationMin: true,
        timezone: true,
        meetUrl: true,
        course: { select: { modules: { orderBy: { order: 'asc' }, select: { id: true } } } },
      },
    });
    const modules = group.course.modules;
    const times = generateSessionTimes(
      {
        startDate: dateKeyOf(group.startDate),
        weekdays: group.weekdays,
        startTime: group.startTime,
        timezone: group.timezone,
      },
      modules.length * SESSIONS_PER_MODULE,
    );
    const now = new Date();
    if (replace) {
      await tx.liveSession.deleteMany({
        where: { groupId, startsAt: { gt: now }, attendance: { none: {} } },
      });
    }
    const existing = await tx.liveSession.findMany({
      where: { groupId },
      select: { startsAt: true },
    });
    const have = new Set(existing.map((s) => s.startsAt.getTime()));
    const meetUrl = group.meetUrl ?? 'https://meet.google.com/xxx-xxxx-xxx';
    const data = times
      .map((startsAt, i) => ({
        groupId,
        moduleId: modules[Math.floor(i / SESSIONS_PER_MODULE)].id,
        title: `Leksioni ${(i % SESSIONS_PER_MODULE) + 1}`,
        startsAt,
        durationMin: group.durationMin,
        meetUrl,
      }))
      .filter((s) => !have.has(s.startsAt.getTime()));
    if (data.length > 0) await tx.liveSession.createMany({ data });
    const last = times.at(-1);
    if (last) {
      await tx.group.update({
        where: { id: groupId },
        data: { endDate: new Date(`${localDateKey(last, group.timezone)}T00:00:00Z`) },
      });
    }
  }

  // ---- Shapes ----

  private toSummary(g: GroupRow, taken: number): GroupSummaryRecord {
    const seatsLeft = Math.max(0, g.capacity - taken);
    return {
      id: g.id,
      name: g.name,
      course: g.course,
      startDate: dateKeyOf(g.startDate),
      endDate: dateKeyOf(g.endDate),
      weekdays: g.weekdays,
      startTime: g.startTime,
      durationMin: g.durationMin,
      timezone: g.timezone,
      capacity: g.capacity,
      seatsLeft,
      status: g.status === GroupStatus.OPEN && seatsLeft === 0 ? GroupStatus.FULL : g.status,
      instructor: g.instructor,
    };
  }

  private async toAdmin(g: GroupRow): Promise<AdminGroupRecord> {
    const now = new Date();
    const [enrolledCount, heldCount, waitlistedCount] = await Promise.all([
      this.prisma.enrollment.count({ where: { groupId: g.id, status: EnrollmentStatus.APPROVED } }),
      this.prisma.enrollment.count({
        where: {
          groupId: g.id,
          status: EnrollmentStatus.PENDING_PAYMENT,
          holdExpiresAt: { gt: now },
        },
      }),
      this.prisma.enrollment.count({
        where: { groupId: g.id, status: EnrollmentStatus.WAITLISTED },
      }),
    ]);
    return {
      ...this.toSummary(g, enrolledCount + heldCount),
      meetUrl: g.meetUrl,
      offlineEmailDays: g.offlineEmailDays,
      enrolledCount,
      heldCount,
      waitlistedCount,
      sessionCount: g._count.sessions,
      createdAt: g.createdAt,
    };
  }

  private async isVisible(courseId: string): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true },
    });
    return Boolean(course?.isPublished);
  }

  private async assertInstructor(instructorId: string | null | undefined): Promise<void> {
    if (!instructorId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: { role: true },
    });
    if (user?.role !== Role.INSTRUCTOR) {
      throw new BadRequestException('Instruktori duhet të jetë një përdorues me rolin INSTRUCTOR');
    }
  }
}
