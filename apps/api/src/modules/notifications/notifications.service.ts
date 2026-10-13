import { localDateKey, zonedParts } from '@ai-academy/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import {
  EmailType,
  EnrollmentStatus,
  GroupStatus,
  ModuleStatus,
  PaymentStatus,
} from '../../generated/prisma/client.js';
import { MailService } from '../../mail/mail.service.js';
import * as templates from '../../mail/templates.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const HOUR = 60 * 60_000;

/**
 * Scheduled emails. Every method takes `now`, so tests drive them directly; every send goes
 * through MailService.sendLogged with a unique key, so running a job twice never sends twice.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  /**
   * Lecture reminders: 24 hours and 1 hour before each session, to the students of the
   * session's group who have a CONFIRMED payment for that month. The 24-hour mail goes to
   * sessions starting within 24 hours (but more than an hour away), the 1-hour mail to
   * sessions starting within the hour, so a late restart still catches up.
   */
  async sendLectureReminders(now = new Date()): Promise<number> {
    const sessions = await this.prisma.liveSession.findMany({
      where: { startsAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) } },
      select: {
        id: true,
        title: true,
        startsAt: true,
        durationMin: true,
        meetUrl: true,
        groupId: true,
        moduleId: true,
        module: { select: { courseId: true, course: { select: { title: true } } } },
      },
    });
    let sent = 0;
    for (const session of sessions) {
      const hoursBefore: 24 | 1 = session.startsAt.getTime() - now.getTime() <= HOUR ? 1 : 24;
      const students = await this.paidStudentsOf(
        session.module.courseId,
        session.groupId,
        session.moduleId,
      );
      for (const student of students) {
        const rendered = templates.lectureReminder({
          firstName: student.firstName,
          hoursBefore,
          courseTitle: session.module.course.title,
          session,
          // The group's link goes in the email; the panel still gates the button (PLAN D16).
          meetUrl: session.meetUrl,
          panelUrl: `${this.webUrl}/dashboard`,
        });
        const result = await this.mail.sendLogged({
          to: student.email,
          ...rendered,
          type: hoursBefore === 24 ? EmailType.LECTURE_REMINDER_24H : EmailType.LECTURE_REMINDER_1H,
          uniqueKey: `reminder-${hoursBefore}h:${student.id}:${session.id}`,
          userId: student.id,
          meta: { sessionId: session.id },
        });
        if (result === 'sent') sent++;
      }
    }
    return sent;
  }

  /**
   * The offline-learning email: on a day without a lecture for the group, during the group's
   * run (start to end date), on one of the group's configured days (Sundays off by default),
   * to students who still receive it and have paid the current month. Links to their next
   * unfinished lesson. One per student, group and day.
   */
  async sendOfflineLearningEmails(now = new Date()): Promise<number> {
    const groups = await this.prisma.group.findMany({
      where: { status: { in: [GroupStatus.OPEN, GroupStatus.FULL, GroupStatus.RUNNING] } },
      select: {
        id: true,
        timezone: true,
        startDate: true,
        endDate: true,
        offlineEmailDays: true,
        courseId: true,
        course: { select: { title: true, slug: true } },
      },
    });
    let sent = 0;
    for (const group of groups) {
      const today = localDateKey(now, group.timezone);
      const start = group.startDate.toISOString().slice(0, 10);
      const end = group.endDate.toISOString().slice(0, 10);
      if (today < start || today > end) continue;
      if (!group.offlineEmailDays.includes(zonedParts(now, group.timezone).weekday)) continue;

      const lectureToday = await this.prisma.liveSession.findFirst({
        where: {
          groupId: group.id,
          startsAt: {
            gte: new Date(now.getTime() - 36 * HOUR),
            lte: new Date(now.getTime() + 36 * HOUR),
          },
        },
        select: { startsAt: true },
      });
      const sessionsAround = await this.prisma.liveSession.findMany({
        where: {
          groupId: group.id,
          startsAt: {
            gte: new Date(now.getTime() - 36 * HOUR),
            lte: new Date(now.getTime() + 36 * HOUR),
          },
        },
        select: { startsAt: true },
      });
      if (
        lectureToday &&
        sessionsAround.some((s) => localDateKey(s.startsAt, group.timezone) === today)
      ) {
        continue;
      }

      const students = await this.prisma.enrollment.findMany({
        where: {
          groupId: group.id,
          status: EnrollmentStatus.APPROVED,
          user: { offlineEmailsEnabled: true },
        },
        select: {
          userId: true,
          user: { select: { email: true, firstName: true } },
        },
      });
      for (const { userId, user } of students) {
        const current = await this.currentModule(userId, group.courseId);
        if (!current) continue;
        const nextSession = await this.prisma.liveSession.findFirst({
          where: { groupId: group.id, startsAt: { gt: now } },
          orderBy: { startsAt: 'asc' },
          select: { title: true, startsAt: true, durationMin: true },
        });
        const lesson = current.lessons.find((l) => l.progress.length === 0) ?? null;
        const rendered = templates.offlineLearning({
          firstName: user.firstName,
          courseTitle: group.course.title,
          moduleTitle: `Moduli ${current.order}: ${current.title}`,
          lessonTitle: lesson?.title ?? null,
          lessonUrl: lesson
            ? `${this.webUrl}/learn/${group.course.slug}/${current.id}/lessons/${lesson.id}`
            : `${this.webUrl}/learn/${group.course.slug}/${current.id}`,
          nextSession,
        });
        const result = await this.mail.sendLogged({
          to: user.email,
          ...rendered,
          type: EmailType.OFFLINE_LEARNING,
          uniqueKey: `offline:${userId}:${group.id}:${today}`,
          userId,
          meta: { groupId: group.id, day: today },
        });
        if (result === 'sent') sent++;
      }
    }
    return sent;
  }

  /** Groups move to RUNNING on their start date and to FINISHED after their end date. */
  async refreshGroupStatuses(now = new Date()): Promise<void> {
    const groups = await this.prisma.group.findMany({
      where: { status: { not: GroupStatus.FINISHED } },
      select: { id: true, status: true, startDate: true, endDate: true, timezone: true },
    });
    for (const g of groups) {
      const today = localDateKey(now, g.timezone);
      const start = g.startDate.toISOString().slice(0, 10);
      const end = g.endDate.toISOString().slice(0, 10);
      const next = today > end ? GroupStatus.FINISHED : today >= start ? GroupStatus.RUNNING : null;
      if (next && next !== g.status) {
        await this.prisma.group.update({ where: { id: g.id }, data: { status: next } });
        this.logger.log(`Group ${g.id} is now ${next}`);
      }
    }
  }

  /** Students of a group (or course, for legacy sessions) who paid the given module. */
  private paidStudentsOf(courseId: string, groupId: string | null, moduleId: string) {
    return this.prisma.user.findMany({
      where: {
        enrollments: {
          some: {
            courseId,
            status: EnrollmentStatus.APPROVED,
            ...(groupId && { groupId }),
            payments: { some: { moduleId, status: PaymentStatus.CONFIRMED } },
          },
        },
      },
      select: { id: true, email: true, firstName: true },
    });
  }

  /** The student's ACTIVE (or FAILED) module of a course with its lessons, if the month is paid. */
  private async currentModule(userId: string, courseId: string) {
    const progress = await this.prisma.moduleProgress.findFirst({
      where: {
        userId,
        status: { in: [ModuleStatus.ACTIVE, ModuleStatus.FAILED] },
        module: {
          courseId,
          payments: { some: { status: PaymentStatus.CONFIRMED, enrollment: { userId } } },
        },
      },
      orderBy: { module: { order: 'asc' } },
      select: {
        module: {
          select: {
            id: true,
            order: true,
            title: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                progress: { where: { userId }, select: { lessonId: true } },
              },
            },
          },
        },
      },
    });
    return progress?.module ?? null;
  }
}
