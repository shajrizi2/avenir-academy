import type { AdminGroup, CheckoutResult, CourseDetail, LessonSummary } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailMessage } from '../src/mail/mail.service.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, bootApp, captureMail, createUser, MEET } from './support.js';

/** Lecture reminders, offline-learning emails and their idempotency (jobs run by hand). */
describe('Scheduled emails (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let mail: MailMessage[];
  const run = Date.now();
  let admin: { id: string; token: string };
  let paid: { id: string; email: string; token: string };
  let unpaid: { id: string; email: string; token: string };
  let course: CourseDetail;
  let group: AdminGroup;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    notifications = app.get(NotificationsService);
    mail = captureMail();
    admin = await createUser(app, prisma, 'admin', 'ADMIN');
    paid = await createUser(app, prisma, 'paid', 'STUDENT');
    unpaid = await createUser(app, prisma, 'unpaid', 'STUDENT');

    course = (
      await http()
        .post('/api/v1/courses')
        .set(bearer(admin.token))
        .send({
          slug: `notify-${run}`,
          title: 'Kursi i njoftimeve',
          summary: 'Një kurs i krijuar nga testi i njoftimeve.',
          description: 'Mbulon kujtesat dhe email-et e mësimit offline.',
          isPublished: true,
        })
        .expect(201)
    ).body as CourseDetail;
    await http()
      .post(`/api/v1/courses/${course.id}/modules`)
      .set(bearer(admin.token))
      .send({ title: 'Moduli një', description: 'Moduli i parë i kursit të njoftimeve.' })
      .expect(201);
    course = (await http().get(`/api/v1/courses/by-id/${course.id}`).set(bearer(admin.token)))
      .body as CourseDetail;
    group = (
      await http()
        .post(`/api/v1/courses/${course.id}/groups`)
        .set(bearer(admin.token))
        .send({
          name: 'Grupi N',
          startDate: '2026-11-01',
          weekdays: [1, 3, 5],
          startTime: '19:00',
          meetUrl: MEET,
        })
        .expect(201)
    ).body as AdminGroup;
    await http()
      .post(`/api/v1/modules/${course.modules[0].id}/lessons`)
      .set(bearer(admin.token))
      .send({ title: 'Mësimi i parë', content: '# Mirë se vini\n\nLexo këtë para leksionit.' })
      .expect(201);

    // One student pays (bank transfer confirmed by the admin); the other only holds a seat.
    for (const s of [paid, unpaid]) {
      const res = (
        await http()
          .post('/api/v1/checkout')
          .set(bearer(s.token))
          .send({ groupId: group.id, provider: 'BANK_TRANSFER' })
          .expect(200)
      ).body as CheckoutResult;
      if (res.kind !== 'BANK_TRANSFER') throw new Error('expected bank transfer');
      if (s === paid) {
        await http()
          .post(`/api/v1/payments/${res.paymentId}/confirm`)
          .set(bearer(admin.token))
          .send({})
          .expect(200);
      }
    }
    mail.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sends the 24-hour reminder once, only to students who paid the month', async () => {
    // Monday 2 November 2026, 19:00 Tirana = 18:00 UTC. 18:30 UTC the day before is 23.5 h ahead.
    const now = new Date('2026-11-01T18:30:00Z');
    expect(await notifications.sendLectureReminders(now)).toBe(1);
    expect(await notifications.sendLectureReminders(now)).toBe(0);
    expect(mail).toHaveLength(1);
    expect(mail[0].to).toBe(paid.email);
    expect(mail[0].subject).toBe('Leksioni live nesër: Leksioni 1');
    expect(mail[0].text).toContain('e hënë, 2 nëntor 2026');
    expect(mail[0].text).toContain('19:00–21:00');
    expect(mail[0].html).toContain('Hyr në Google Meet');
    expect(await prisma.emailLog.count({ where: { type: 'LECTURE_REMINDER_24H' } })).toBe(1);
  });

  it('sends the 1-hour reminder with the Meet link, separately from the 24-hour one', async () => {
    mail.length = 0;
    const now = new Date('2026-11-02T17:30:00Z');
    expect(await notifications.sendLectureReminders(now)).toBe(1);
    expect(await notifications.sendLectureReminders(now)).toBe(0);
    expect(mail[0].subject).toBe('Leksioni live pas një ore: Leksioni 1');
    expect(mail[0].html).toContain(`href="${MEET}"`);
    expect(await prisma.emailLog.count({ where: { type: 'LECTURE_REMINDER_1H' } })).toBe(1);
  });

  it('sends the offline-learning email on a day without a lecture, with the next lesson, once', async () => {
    mail.length = 0;
    // Tuesday 3 November 2026, 09:00 Tirana (08:00 UTC): no lecture (Mon/Wed/Fri group).
    const tuesday = new Date('2026-11-03T08:00:00Z');
    expect(await notifications.sendOfflineLearningEmails(tuesday)).toBe(1);
    expect(await notifications.sendOfflineLearningEmails(tuesday)).toBe(0);
    expect(mail).toHaveLength(1);
    expect(mail[0].to).toBe(paid.email);
    expect(mail[0].subject).toContain('mësimin offline');
    const lessons = (
      await http()
        .get(`/api/v1/modules/${course.modules[0].id}/lessons`)
        .set(bearer(paid.token))
        .expect(200)
    ).body as LessonSummary[];
    expect(mail[0].text).toContain(
      `/learn/${course.slug}/${course.modules[0].id}/lessons/${lessons[0].id}`,
    );
    expect(mail[0].text).toContain('Mësimi i parë');
  });

  it('skips lecture days and Sundays', async () => {
    mail.length = 0;
    // Wednesday 4 November: a lecture day. Sunday 8 November: off by default.
    expect(await notifications.sendOfflineLearningEmails(new Date('2026-11-04T08:00:00Z'))).toBe(0);
    expect(await notifications.sendOfflineLearningEmails(new Date('2026-11-08T08:00:00Z'))).toBe(0);
    expect(mail).toHaveLength(0);
  });

  it('respects the student’s opt-out for offline emails only', async () => {
    await http()
      .patch('/api/v1/users/me')
      .set(bearer(paid.token))
      .send({ offlineEmailsEnabled: false })
      .expect(200);
    mail.length = 0;
    // Thursday 5 November: no lecture, but the student opted out.
    expect(await notifications.sendOfflineLearningEmails(new Date('2026-11-05T08:00:00Z'))).toBe(0);
    // Reminders still go out: Friday's lecture, 24 hours before.
    expect(await notifications.sendLectureReminders(new Date('2026-11-05T18:30:00Z'))).toBe(1);
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toContain('nesër');
  });

  it('moves groups to RUNNING and FINISHED by date', async () => {
    await notifications.refreshGroupStatuses(new Date('2026-11-02T10:00:00Z'));
    expect((await prisma.group.findUniqueOrThrow({ where: { id: group.id } })).status).toBe(
      'RUNNING',
    );
    await notifications.refreshGroupStatuses(new Date('2027-01-10T10:00:00Z'));
    expect((await prisma.group.findUniqueOrThrow({ where: { id: group.id } })).status).toBe(
      'FINISHED',
    );
  });
});
