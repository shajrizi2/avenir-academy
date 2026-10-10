import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import { EnrollmentStatus, ModuleStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModuleAccessService } from '../course-modules/module-access.service.js';
import type { CreateSessionDto } from './dto/create-session.dto.js';
import type { SaveAttendanceDto } from './dto/save-attendance.dto.js';
import type { UpdateSessionDto } from './dto/update-session.dto.js';
import { hasEnded, sessionSelect, type SessionView, toSessionView } from './session.view.js';

const personSelect = { id: true, firstName: true, lastName: true, email: true } as const;
const moduleRefSelect = {
  select: {
    id: true,
    order: true,
    title: true,
    course: { select: { id: true, slug: true, title: true } },
  },
} as const;

type ModuleRef = {
  id: string;
  order: number;
  title: string;
  course: { id: string; slug: string; title: string };
};
type Person = { id: string; firstName: string; lastName: string; email: string };

export interface StaffSessionRecord extends SessionView {
  presentCount: number;
}
export interface StudentSessionRecord extends SessionView {
  module: ModuleRef;
}
export interface SessionAttendanceRecord {
  session: SessionView & { module: ModuleRef };
  records: { user: Person; present: boolean | null }[];
}

/** Sessions last at most 8 hours (SESSION_MAX_DURATION_MIN), so older ones have ended. */
const LOOKBACK_MS = 8 * 60 * 60_000;
const UPCOMING_LIMIT = 10;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ModuleAccessService,
  ) {}

  async listForModule(user: AuthUser, moduleId: string): Promise<StaffSessionRecord[]> {
    await this.access.assertStaff(user, moduleId);
    const sessions = await this.prisma.liveSession.findMany({
      where: { moduleId },
      orderBy: { startsAt: 'asc' },
      select: {
        ...sessionSelect,
        _count: { select: { attendance: { where: { present: true } } } },
      },
    });
    return sessions.map(({ _count, ...s }) => ({ ...s, presentCount: _count.attendance }));
  }

  async create(user: AuthUser, moduleId: string, dto: CreateSessionDto): Promise<SessionView> {
    await this.access.assertStaff(user, moduleId);
    const session = await this.prisma.liveSession.create({
      data: {
        moduleId,
        title: dto.title,
        startsAt: new Date(dto.startsAt),
        durationMin: dto.durationMin,
        meetUrl: dto.meetUrl,
      },
      select: sessionSelect,
    });
    return toSessionView(session, true);
  }

  async update(user: AuthUser, id: string, dto: UpdateSessionDto): Promise<SessionView> {
    await this.assertSessionStaff(user, id);
    const session = await this.prisma.liveSession.update({
      where: { id },
      data: {
        title: dto.title,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        durationMin: dto.durationMin,
        meetUrl: dto.meetUrl,
      },
      select: sessionSelect,
    });
    return toSessionView(session, true);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    await this.assertSessionStaff(user, id);
    await this.prisma.liveSession.delete({ where: { id } });
  }

  /** The roster: every approved student of the course, with their attendance (if recorded). */
  async getAttendance(user: AuthUser, id: string): Promise<SessionAttendanceRecord> {
    const { courseId } = await this.assertSessionStaff(user, id);
    const [session, students, attendance] = await Promise.all([
      this.prisma.liveSession.findUniqueOrThrow({
        where: { id },
        select: { ...sessionSelect, module: moduleRefSelect },
      }),
      this.rosterOf(courseId),
      this.prisma.attendance.findMany({
        where: { sessionId: id },
        select: { userId: true, present: true },
      }),
    ]);
    const presentByUser = new Map(attendance.map((a) => [a.userId, a.present]));
    return {
      session: { ...toSessionView(session, true), module: session.module },
      records: students.map((student) => ({
        user: student,
        present: presentByUser.get(student.id) ?? null,
      })),
    };
  }

  async saveAttendance(
    user: AuthUser,
    id: string,
    dto: SaveAttendanceDto,
  ): Promise<SessionAttendanceRecord> {
    const { courseId } = await this.assertSessionStaff(user, id);
    const rosterIds = new Set((await this.rosterOf(courseId)).map((s) => s.id));
    const outsider = dto.records.find((r) => !rosterIds.has(r.userId));
    if (outsider) {
      throw new BadRequestException(
        'Attendance can only be recorded for students enrolled in this course',
      );
    }
    await this.prisma.$transaction(
      dto.records.map(({ userId, present }) =>
        this.prisma.attendance.upsert({
          where: { sessionId_userId: { sessionId: id, userId } },
          create: { sessionId: id, userId, present },
          update: { present },
        }),
      ),
    );
    return this.getAttendance(user, id);
  }

  /** The student's next sessions in modules they have unlocked. */
  async upcomingForStudent(userId: string): Promise<StudentSessionRecord[]> {
    const now = new Date();
    const sessions = await this.prisma.liveSession.findMany({
      where: {
        startsAt: { gte: new Date(now.getTime() - LOOKBACK_MS) },
        module: {
          course: { enrollments: { some: { userId, status: EnrollmentStatus.APPROVED } } },
          progress: { some: { userId, status: { not: ModuleStatus.LOCKED } } },
        },
      },
      orderBy: { startsAt: 'asc' },
      take: UPCOMING_LIMIT * 2,
      select: { ...sessionSelect, module: moduleRefSelect },
    });
    return sessions
      .filter((s) => !hasEnded(s, now))
      .slice(0, UPCOMING_LIMIT)
      .map(({ module, ...s }) => ({ ...toSessionView(s, false, now), module }));
  }

  private async assertSessionStaff(user: AuthUser, sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { moduleId: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.access.assertStaff(user, session.moduleId);
  }

  private rosterOf(courseId: string): Promise<Person[]> {
    return this.prisma.user.findMany({
      where: { enrollments: { some: { courseId, status: EnrollmentStatus.APPROVED } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: personSelect,
    });
  }
}
