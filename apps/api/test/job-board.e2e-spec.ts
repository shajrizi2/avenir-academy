import type { JobBoardPage, PublicJob } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailMessage } from '../src/mail/mail.service.js';
import { JobSeekersService } from '../src/modules/jobs/seekers/job-seekers.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootApp, captureMail } from './support.js';

/** The public job list with search, and the email-code sign-in with its consent tick (PLAN D36, D37). */
describe('Job board (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mail: MailMessage[];
  const run = Date.now();

  const http = () => request(app.getHttpServer());
  const email = (name: string) => `${name}.${run}@jobs.test`;
  const codeFor = (to: string) => {
    const message = [...mail].reverse().find((m) => m.to === to);
    const match = message?.text.match(/\b(\d{6})\b/);
    if (!match) throw new Error(`no code mailed to ${to}`);
    return match[1];
  };
  const list = async (query = '') =>
    (await http().get(`/api/v1/jobs${query}`).expect(200)).body as JobBoardPage;

  beforeAll(async () => {
    // The suite signs many people in from one address (the per-address limit is the academy's).
    process.env.AUTH_RATE_LIMIT_PER_MIN = '100000';
    ({ app, prisma } = await bootApp());
    mail = captureMail();
    for (const table of ['jobListing', 'job', 'jobCompany', 'jobBlock'] as const) {
      await (prisma[table] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
    }
    const acme = await prisma.jobCompany.create({ data: { key: 'acme', name: 'Acme' } });
    const pixel = await prisma.jobCompany.create({
      data: { key: 'pixel studio', name: 'Pixel Studio' },
    });
    const make = (companyId: string, title: string, over: Record<string, unknown> = {}) =>
      prisma.job.create({
        data: {
          companyId,
          title,
          fingerprint: `${companyId}|${title}`,
          category: 'MARKETING',
          region: 'WORLDWIDE',
          applyUrl: `https://boards.greenhouse.io/acme/jobs/${title.length}`,
          applySource: 'GREENHOUSE',
          status: 'OPEN',
          rule: 'eligible:worldwide',
          scamReasons: [],
          postedAt: new Date('2026-11-10T00:00:00Z'),
          ...over,
        },
      });
    await make(acme.id, 'Growth Lead', { postedAt: new Date('2026-11-13T00:00:00Z') });
    await make(acme.id, 'SEO Writer');
    await make(pixel.id, 'React Developer', { category: 'ENGINEERING' });
    await make(pixel.id, 'Brand Designer', { category: 'DESIGN' });
    await make(acme.id, 'Closed Role', { status: 'CLOSED', closeReason: 'TOO_OLD' });
    await make(acme.id, 'Remote Copywriter', {
      summary: 'Write landing pages and emails for our product.',
      applySource: 'REMOTEOK',
      applyUrl: 'https://remoteok.com/remote-jobs/1',
      listings: {
        create: {
          source: 'REMOTEOK',
          externalId: `rok-${run}`,
          sourceUrl: 'https://remoteok.com/remote-jobs/1',
        },
      },
    });
    await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: { jobBoardPublic: false },
    });
  });

  afterAll(async () => {
    delete process.env.AUTH_RATE_LIMIT_PER_MIN;
    await app.close();
  });

  it('lists open jobs, newest first, with type counts and a short summary', async () => {
    const page = await list();
    expect(page.public).toBe(false);
    expect(page.jobs[0].title).toBe('Growth Lead');
    expect(page.total).toBe(5);
    expect(page.jobs.map((j) => j.title)).not.toContain('Closed Role');
    expect(page.categories[0]).toEqual({ category: 'MARKETING', count: 3 });
    expect(page.categories).toHaveLength(3);
    const feed = page.jobs.find((j) => j.title === 'Remote Copywriter') as PublicJob;
    expect(feed.summary).toBe('Write landing pages and emails for our product.');
    // The title and "Apliko" link to the job on the board: the link back its terms ask for.
    expect(feed.applyUrl).toBe('https://remoteok.com/remote-jobs/1');
    expect(feed).not.toHaveProperty('credit');
  });

  it('searches titles and company names, every word, any case, with the type dropdown', async () => {
    expect((await list('?q=react')).jobs.map((j) => j.title)).toEqual(['React Developer']);
    expect((await list('?q=pixel')).jobs.map((j) => j.title).sort()).toEqual([
      'Brand Designer',
      'React Developer',
    ]);
    expect((await list('?q=PIXEL%20brand')).jobs.map((j) => j.title)).toEqual(['Brand Designer']);
    expect((await list('?q=acme&category=MARKETING')).total).toBe(3);
    expect((await list('?q=nothing-like-this')).total).toBe(0);
    expect((await list('?q=%20%20')).total).toBe(5);
    await http()
      .get(`/api/v1/jobs?q=${'x'.repeat(101)}`)
      .expect(400);
    await http().get('/api/v1/jobs?category=NOPE').expect(400);
  });

  it('reports whether the board is public', async () => {
    // Outside production the sign-in pop-up is on even with console email (codes in the log).
    expect((await http().get('/api/v1/jobs/status').expect(200)).body).toEqual({
      public: false,
      signIn: true,
    });
    await prisma.siteSettings.update({ where: { id: 1 }, data: { jobBoardPublic: true } });
    expect((await http().get('/api/v1/jobs/status').expect(200)).body).toEqual({
      public: true,
      signIn: true,
    });
  });

  it('signs in with an emailed code and records the email consent tick', async () => {
    const to = email('ana');
    await http()
      .post('/api/v1/job-seekers/auth/request-code')
      .send({ email: to.toUpperCase() })
      .expect(200);
    expect(mail.find((m) => m.to === to)?.subject).not.toMatch(/\d{6}/);
    await http().post('/api/v1/job-seekers/auth/request-code').send({ email: to }).expect(429);

    const code = codeFor(to);
    const wrong = code === '000000' ? '111111' : '000000';
    await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code: wrong, marketingConsent: true })
      .expect(400);
    await http().post('/api/v1/job-seekers/auth/verify').send({ email: to, code }).expect(400);
    const res = await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code, marketingConsent: true })
      .expect(200);
    expect(res.body).toEqual({ email: to });
    const cookie = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('aj_session='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Max-Age=31536000/);
    const seeker = await prisma.jobSeeker.findUniqueOrThrow({ where: { email: to } });
    expect(seeker.marketingConsent).toBe(true);
    expect(seeker.consentAt).not.toBeNull();

    const session = (cookie as string).split(';')[0];
    expect(
      (await http().get('/api/v1/job-seekers/me').set('Cookie', session).expect(200)).body,
    ).toEqual({ email: to });
    await http().get('/api/v1/job-seekers/me').expect(401);
  });

  it('stores no consent when the tick is off', async () => {
    const seekers = app.get(JobSeekersService);
    const to = email('noconsent');
    await seekers.requestCode(to, new Date());
    await seekers.verify(to, codeFor(to), false, new Date());
    expect(
      (await prisma.jobSeeker.findUniqueOrThrow({ where: { email: to } })).marketingConsent,
    ).toBe(false);
  });

  it('locks a code after five wrong tries', async () => {
    const to = email('locked');
    await http().post('/api/v1/job-seekers/auth/request-code').send({ email: to }).expect(200);
    const code = codeFor(to);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await http()
        .post('/api/v1/job-seekers/auth/verify')
        .send({ email: to, code: wrong, marketingConsent: true })
        .expect(400);
    }
    const res = await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code, marketingConsent: true })
      .expect(400);
    expect(res.body.message).toMatch(/skaduar/);
  });

  it('unsubscribes through the signed link only', async () => {
    const seekers = app.get(JobSeekersService);
    const seeker = await prisma.jobSeeker.findUniqueOrThrow({ where: { email: email('ana') } });
    await http()
      .post('/api/v1/job-seekers/unsubscribe')
      .send({ id: seeker.id, token: 'forged' })
      .expect(400);
    const token = seekers.unsubscribeToken(seeker.id);
    await http().post('/api/v1/job-seekers/unsubscribe').send({ id: seeker.id, token }).expect(200);
    await http().post('/api/v1/job-seekers/unsubscribe').send({ id: seeker.id, token }).expect(200);
    const after = await prisma.jobSeeker.findUniqueOrThrow({ where: { id: seeker.id } });
    expect(after.marketingConsent).toBe(false);
    expect(after.unsubscribedAt).not.toBeNull();
  });

  it('renews a session once a day and cleans up unused accounts', async () => {
    const seekers = app.get(JobSeekersService);
    const now = new Date();
    const to = email('renew');
    await seekers.requestCode(to, now);
    const { token } = await seekers.verify(to, codeFor(to), true, now);
    expect((await seekers.authenticate(token, new Date(now.getTime() + 60_000)))?.renewed).toBe(
      false,
    );
    const later = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const renewed = await seekers.authenticate(token, later);
    expect(renewed?.renewed).toBe(true);
    expect(renewed?.session.expiresAt.getTime()).toBe(later.getTime() + 365 * 24 * 60 * 60 * 1000);

    await prisma.jobSeeker.update({
      where: { email: to },
      data: { lastSeenAt: new Date('2020-01-01') },
    });
    await seekers.cleanup(new Date());
    expect(await prisma.jobSeeker.findUnique({ where: { email: to } })).toBeNull();
  });
});
