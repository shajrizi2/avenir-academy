import type { AdminCampaign, AdminSubscribers } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MailService, type MailMessage } from '../src/mail/mail.service.js';
import { CampaignsService } from '../src/modules/jobs/campaigns/campaigns.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, bootApp, captureMail, createUser } from './support.js';

/** Stored emails and email campaigns (PLAN D37). */
describe('Subscribers and campaigns (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mail: MailMessage[];
  let admin: { id: string; token: string };
  let adminEmail: string;
  let campaigns: CampaignsService;
  const run = Date.now();
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    mail = captureMail();
    campaigns = app.get(CampaignsService);
    await prisma.emailCampaign.deleteMany();
    await prisma.jobSeeker.deleteMany();
    admin = await createUser(app, prisma, 'campaign-admin', 'ADMIN');
    adminEmail = (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).email;
    await prisma.jobSeeker.createMany({
      data: [
        ...Array.from({ length: 7 }, (_, i) => ({
          email: `fan${i}.${run}@jobs.test`,
          marketingConsent: true,
          consentAt: new Date(),
        })),
        { email: `quiet.${run}@jobs.test`, marketingConsent: false },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists and exports the stored emails, for admins only', async () => {
    const student = await createUser(app, prisma, 'campaign-student', 'STUDENT');
    await http().get('/api/v1/admin/subscribers').set(bearer(student.token)).expect(403);
    const body = (
      await http().get('/api/v1/admin/subscribers').set(bearer(admin.token)).expect(200)
    ).body as AdminSubscribers;
    expect(body).toMatchObject({ total: 8, consenting: 7 });
    const csv = await http()
      .get('/api/v1/admin/subscribers/export.csv')
      .set(bearer(admin.token))
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\n')[0]).toBe('email,pranon_emaile,regjistruar,pranoi_me');
    expect(csv.text).toContain(`quiet.${run}@jobs.test,jo,`);
  });

  it('drafts a campaign, sends a test to the admin, then sends to those who ticked the box', async () => {
    const draft = (
      await http()
        .post('/api/v1/admin/campaigns')
        .set(bearer(admin.token))
        .send({ subject: 'Punë të reja', body: 'Rreshti i parë.\n\nRreshti i dytë.' })
        .expect(201)
    ).body as AdminCampaign;
    expect(draft).toMatchObject({ status: 'DRAFT', recipients: 0 });
    await http()
      .post('/api/v1/admin/campaigns')
      .set(bearer(admin.token))
      .send({ subject: '', body: 'x' })
      .expect(400);

    await http()
      .post(`/api/v1/admin/campaigns/${draft.id}/test`)
      .set(bearer(admin.token))
      .expect(201);
    const test = mail.find((m) => m.to === adminEmail);
    expect(test?.subject).toBe('[Provë] Punë të reja');
    expect(test?.text).toContain('Rreshti i dytë.');

    const started = (
      await http()
        .post(`/api/v1/admin/campaigns/${draft.id}/send`)
        .set(bearer(admin.token))
        .expect(201)
    ).body as AdminCampaign;
    expect(started).toMatchObject({ status: 'SENDING', recipients: 7, sent: 0 });
    await http()
      .patch(`/api/v1/admin/campaigns/${draft.id}`)
      .set(bearer(admin.token))
      .send({ subject: 'x', body: 'y' })
      .expect(400);

    // 3 a minute, at most 5 a day.
    const limits = { perMinute: 3, daily: 5 };
    const morning = new Date('2026-11-14T08:00:00Z');
    expect(await campaigns.tick(morning, limits)).toBe(3);
    expect(await campaigns.tick(new Date(morning.getTime() + 60_000), limits)).toBe(2);
    expect(await campaigns.tick(new Date(morning.getTime() + 120_000), limits)).toBe(0);

    const sent = mail.filter((m) => m.subject === 'Punë të reja');
    expect(sent).toHaveLength(5);
    expect(sent.every((m) => !m.to.startsWith('quiet.'))).toBe(true);
    expect(sent[0].text).toMatch(/cregjistrohu\?id=\w+&t=[\w-]+/);
    expect(sent[0].headers?.['List-Unsubscribe']).toMatch(/^<http.*cregjistrohu/);

    // Someone unsubscribes before the rest go out the next day: they are skipped.
    const pending = await prisma.emailCampaignRecipient.findFirstOrThrow({
      where: { campaignId: draft.id, sentAt: null },
      include: { jobSeeker: true },
    });
    await prisma.jobSeeker.update({
      where: { id: pending.jobSeekerId },
      data: { marketingConsent: false },
    });
    expect(await campaigns.tick(new Date('2026-11-15T08:00:00Z'), limits)).toBe(1);
    const [done] = (
      await http().get('/api/v1/admin/campaigns').set(bearer(admin.token)).expect(200)
    ).body as AdminCampaign[];
    expect(done).toMatchObject({ status: 'SENT', recipients: 6, sent: 6, failed: 0 });
  });

  it('never sends the same campaign to the same person twice', async () => {
    const limits = { perMinute: 10, daily: 100 };
    const [done] = await campaigns.list();
    await prisma.emailCampaignRecipient.updateMany({
      where: { campaignId: done.id },
      data: { sentAt: null },
    });
    await prisma.emailCampaign.update({ where: { id: done.id }, data: { status: 'SENDING' } });
    const send = vi.spyOn(MailService.prototype, 'send');
    send.mockClear();
    await campaigns.tick(new Date('2026-11-16T08:00:00Z'), limits);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses to start a campaign nobody can receive, and deletes a stored email', async () => {
    await prisma.jobSeeker.updateMany({ data: { marketingConsent: false } });
    const draft = await campaigns.create('Bosh', 'Asnjë', admin.id);
    await http()
      .post(`/api/v1/admin/campaigns/${draft.id}/send`)
      .set(bearer(admin.token))
      .expect(400);
    const quiet = await prisma.jobSeeker.findUniqueOrThrow({
      where: { email: `quiet.${run}@jobs.test` },
    });
    await http()
      .delete(`/api/v1/admin/subscribers/${quiet.id}`)
      .set(bearer(admin.token))
      .expect(200);
    expect(await prisma.jobSeeker.findUnique({ where: { id: quiet.id } })).toBeNull();
  });
});
