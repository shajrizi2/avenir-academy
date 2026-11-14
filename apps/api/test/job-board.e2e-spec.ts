import type { JobBoardPage, PublicJob } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailMessage } from '../src/mail/mail.service.js';
import { JobSeekersService } from '../src/modules/jobs/seekers/job-seekers.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootApp, captureMail } from './support.js';

/** The public job list, email-code login, saved jobs and reports (PLAN D36). */
describe('Job board (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mail: MailMessage[];
  const run = Date.now();
  const ids: Record<string, string> = {};

  const http = () => request(app.getHttpServer());
  const email = (name: string) => `${name}.${run}@jobs.test`;
  const codeFor = (to: string) => {
    const message = [...mail].reverse().find((m) => m.to === to);
    const match = message?.text.match(/\b(\d{6})\b/);
    if (!match) throw new Error(`no code mailed to ${to}`);
    return match[1];
  };

  /** Signs in through the API and returns the session cookie. */
  async function signIn(name: string): Promise<string> {
    const to = email(name);
    await http().post('/api/v1/job-seekers/auth/request-code').send({ email: to }).expect(200);
    const res = await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code: codeFor(to) })
      .expect(200);
    const cookie = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('aj_session='));
    if (!cookie) throw new Error('no session cookie');
    return cookie.split(';')[0];
  }

  beforeAll(async () => {
    // The suite signs many people in from one address (the per-address limit is the academy's).
    process.env.AUTH_RATE_LIMIT_PER_MIN = '100000';
    ({ app, prisma } = await bootApp());
    mail = captureMail();
    for (const table of [
      'jobReport',
      'savedJob',
      'jobListing',
      'job',
      'jobCompany',
      'jobBlock',
    ] as const) {
      await (prisma[table] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
    }
    const company = await prisma.jobCompany.create({ data: { key: 'board co', name: 'Board Co' } });
    const make = async (title: string, over: Record<string, unknown> = {}) =>
      (
        await prisma.job.create({
          data: {
            companyId: company.id,
            title,
            fingerprint: `board co|${title}|WORLDWIDE`,
            category: 'MARKETING',
            region: 'WORLDWIDE',
            applyUrl: `https://boards.greenhouse.io/boardco/jobs/${title.length}`,
            applySource: 'GREENHOUSE',
            status: 'OPEN',
            rule: 'eligible:worldwide',
            scamReasons: [],
            postedAt: new Date('2026-11-10T00:00:00Z'),
            ...over,
          },
        })
      ).id;
    ids.newest = await make('Growth Lead', { postedAt: new Date('2026-11-13T00:00:00Z') });
    ids.older = await make('SEO Writer');
    ids.design = await make('Brand Designer', { category: 'DESIGN' });
    ids.closed = await make('Closed Role', { status: 'CLOSED', closeReason: 'TOO_OLD' });
    ids.rejected = await make('US Only', { status: 'REJECTED', rule: 'not_eligible:location' });
    ids.feed = await make('Remote Copywriter', {
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

  it('lists open jobs only, newest first, with category counts and job-board credits', async () => {
    const page = (await http().get('/api/v1/jobs').expect(200)).body as JobBoardPage;
    expect(page.public).toBe(false);
    expect(new Set(page.jobs.map((j) => j.title))).toEqual(
      new Set(['Growth Lead', 'SEO Writer', 'Brand Designer', 'Remote Copywriter']),
    );
    expect(page.jobs[0].title).toBe('Growth Lead');
    expect(page.total).toBe(4);
    expect(page.jobs.map((j) => j.title)).not.toContain('Closed Role');
    expect(page.jobs.map((j) => j.title)).not.toContain('US Only');
    expect(page.categories).toEqual([
      { category: 'MARKETING', count: 3 },
      { category: 'DESIGN', count: 1 },
    ]);
    const feed = page.jobs.find((j) => j.title === 'Remote Copywriter') as PublicJob;
    expect(feed.credit).toEqual({ source: 'REMOTEOK', url: 'https://remoteok.com/remote-jobs/1' });
    expect(page.jobs.find((j) => j.title === 'Growth Lead')?.credit).toBeNull();

    const design = (await http().get('/api/v1/jobs?category=DESIGN').expect(200))
      .body as JobBoardPage;
    expect(design.jobs.map((j) => j.title)).toEqual(['Brand Designer']);
    await http().get('/api/v1/jobs?category=NOPE').expect(400);
  });

  it('reports whether the board is public', async () => {
    expect((await http().get('/api/v1/jobs/status').expect(200)).body).toEqual({ public: false });
    await prisma.siteSettings.update({ where: { id: 1 }, data: { jobBoardPublic: true } });
    expect((await http().get('/api/v1/jobs/status').expect(200)).body).toEqual({ public: true });
  });

  it('signs in with an emailed code, which never appears in the subject', async () => {
    const to = email('ana');
    await http()
      .post('/api/v1/job-seekers/auth/request-code')
      .send({ email: to.toUpperCase() })
      .expect(200);
    const message = mail.find((m) => m.to === to);
    expect(message?.subject).not.toMatch(/\d{6}/);
    await http().post('/api/v1/job-seekers/auth/request-code').send({ email: to }).expect(429);

    const code = codeFor(to);
    const wrong = code === '000000' ? '111111' : '000000';
    await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code: wrong })
      .expect(400);
    const res = await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code })
      .expect(200);
    expect(res.body).toEqual({ email: to });
    const cookie = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('aj_session='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Max-Age=31536000/);
    await http().post('/api/v1/job-seekers/auth/verify').send({ email: to, code }).expect(400);

    const session = (cookie as string).split(';')[0];
    expect(
      (await http().get('/api/v1/job-seekers/me').set('Cookie', session).expect(200)).body,
    ).toEqual({
      email: to,
    });
    await http().get('/api/v1/job-seekers/me').expect(401);
  });

  it('locks a code after five wrong tries', async () => {
    const to = email('locked');
    await http().post('/api/v1/job-seekers/auth/request-code').send({ email: to }).expect(200);
    const code = codeFor(to);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await http()
        .post('/api/v1/job-seekers/auth/verify')
        .send({ email: to, code: wrong })
        .expect(400);
    }
    const res = await http()
      .post('/api/v1/job-seekers/auth/verify')
      .send({ email: to, code })
      .expect(400);
    expect(res.body.message).toMatch(/skaduar/);
  });

  it('saves jobs, and keeps a saved job that closed, marked closed', async () => {
    const session = await signIn('saver');
    await http().put(`/api/v1/job-seekers/saved/${ids.older}`).set('Cookie', session).expect(204);
    await http().put(`/api/v1/job-seekers/saved/${ids.closed}`).set('Cookie', session).expect(204);
    await http()
      .put(`/api/v1/job-seekers/saved/${ids.rejected}`)
      .set('Cookie', session)
      .expect(404);
    expect(
      (await http().get('/api/v1/job-seekers/saved/ids').set('Cookie', session)).body,
    ).toHaveLength(2);
    const saved = (await http().get('/api/v1/job-seekers/saved').set('Cookie', session).expect(200))
      .body as PublicJob[];
    expect(saved.find((j) => j.id === ids.closed)?.open).toBe(false);
    await http()
      .delete(`/api/v1/job-seekers/saved/${ids.older}`)
      .set('Cookie', session)
      .expect(204);
    expect((await http().get('/api/v1/job-seekers/saved/ids').set('Cookie', session)).body).toEqual(
      [ids.closed],
    );
  });

  it('hides a job after two reports, and blocks a company with three hidden jobs', async () => {
    const one = await signIn('reporter1');
    const two = await signIn('reporter2');
    for (const id of [ids.newest, ids.older, ids.design]) {
      await http()
        .post(`/api/v1/jobs/${id}/report`)
        .set('Cookie', one)
        .send({ reason: 'SCAM' })
        .expect(200);
      expect((await prisma.job.findUniqueOrThrow({ where: { id } })).status).toBe('OPEN');
      await http()
        .post(`/api/v1/jobs/${id}/report`)
        .set('Cookie', two)
        .send({ reason: 'SCAM' })
        .expect(200);
      expect((await prisma.job.findUniqueOrThrow({ where: { id } })).status).toBe('HIDDEN');
    }
    expect(
      await prisma.jobBlock.findFirst({ where: { kind: 'COMPANY', value: 'board co' } }),
    ).not.toBeNull();
    expect((await prisma.jobCompany.findUniqueOrThrow({ where: { key: 'board co' } })).status).toBe(
      'BLOCKED',
    );
    expect((await prisma.job.findUniqueOrThrow({ where: { id: ids.feed } })).status).toBe('HIDDEN');
    await http().post(`/api/v1/jobs/${ids.feed}/report`).send({ reason: 'SCAM' }).expect(401);
  });

  it('signs out, signs out everywhere, and deletes the account with everything in it', async () => {
    const first = await signIn('leaver');
    await http().post('/api/v1/job-seekers/auth/logout').set('Cookie', first).expect(200);
    await http().get('/api/v1/job-seekers/me').set('Cookie', first).expect(401);

    // A second device: a later code, straight through the service (the API allows one a minute).
    const seekers = app.get(JobSeekersService);
    const to = email('leaver');
    const later = new Date(Date.now() + 2 * 60_000);
    await seekers.requestCode(to, later);
    const second = await seekers.verify(to, codeFor(to), later);
    const a = await signIn('leaver2');
    void a;
    const b = `aj_session=${second.token}`;
    await http().get('/api/v1/job-seekers/me').set('Cookie', b).expect(200);
    await http().post('/api/v1/job-seekers/auth/logout-everywhere').set('Cookie', b).expect(200);
    await http().get('/api/v1/job-seekers/me').set('Cookie', b).expect(401);
  });

  it('deletes an account with its saved jobs', async () => {
    const session = await signIn('deleter');
    await http().put(`/api/v1/job-seekers/saved/${ids.closed}`).set('Cookie', session).expect(204);
    await http().delete('/api/v1/job-seekers/me').set('Cookie', session).expect(200);
    await http().get('/api/v1/job-seekers/me').set('Cookie', session).expect(401);
    expect(await prisma.jobSeeker.findUnique({ where: { email: email('deleter') } })).toBeNull();
  });

  it('renews a session once a day and cleans up unused accounts', async () => {
    const seekers = app.get(JobSeekersService);
    const now = new Date();
    const to = email('renew');
    await seekers.requestCode(to, now);
    const { token } = await seekers.verify(to, codeFor(to), now);
    expect((await seekers.authenticate(token, new Date(now.getTime() + 60_000)))?.renewed).toBe(
      false,
    );
    const later = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const renewed = await seekers.authenticate(token, later);
    expect(renewed?.renewed).toBe(true);
    expect(renewed?.session.expiresAt.getTime()).toBe(later.getTime() + 365 * 24 * 60 * 60 * 1000);

    await prisma.jobSeeker.update({
      where: { email: email('renew') },
      data: { lastSeenAt: new Date('2020-01-01') },
    });
    await seekers.cleanup(new Date());
    expect(await prisma.jobSeeker.findUnique({ where: { email: email('renew') } })).toBeNull();
  });
});
