import type { AdminHiddenJob, AdminJobCompany, AdminJobsOverview } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, bootApp, createUser } from './support.js';

/** The admin side of the job board (PLAN D36). */
describe('Job board admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: { id: string; token: string };
  let student: { id: string; token: string };
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    for (const table of [
      'jobReport',
      'savedJob',
      'jobListing',
      'job',
      'jobCompany',
      'jobBlock',
      'jobRun',
    ] as const) {
      await (prisma[table] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
    }
    admin = await createUser(app, prisma, 'jobsadmin', 'ADMIN');
    student = await createUser(app, prisma, 'jobsstudent', 'STUDENT');
  });

  afterAll(async () => {
    await app.close();
  });

  it('is for admins only', async () => {
    await http().get('/api/v1/admin/jobs/overview').expect(401);
    await http().get('/api/v1/admin/jobs/overview').set(bearer(student.token)).expect(403);
    const overview = (
      await http().get('/api/v1/admin/jobs/overview').set(bearer(admin.token)).expect(200)
    ).body as AdminJobsOverview;
    expect(overview.counts).toEqual({ open: 0, rejected: 0, hidden: 0, closed: 0 });
  });

  it('adds a company by its careers link and switches it off', async () => {
    await http()
      .post('/api/v1/admin/jobs/companies')
      .set(bearer(admin.token))
      .send({ name: 'Acme', careersUrl: 'https://acme.com/careers' })
      .expect(400);
    await http()
      .post('/api/v1/admin/jobs/companies')
      .set(bearer(admin.token))
      .send({ name: 'Acme', careersUrl: 'https://jobs.lever.co/acme' })
      .expect(201);
    const [company] = (
      await http().get('/api/v1/admin/jobs/companies').set(bearer(admin.token)).expect(200)
    ).body as AdminJobCompany[];
    expect(company).toMatchObject({
      name: 'Acme',
      ats: 'LEVER',
      boardToken: 'acme',
      status: 'ACTIVE',
      discoveredFrom: 'admin',
    });
    await http()
      .patch(`/api/v1/admin/jobs/companies/${company.id}`)
      .set(bearer(admin.token))
      .send({ status: 'DISABLED' })
      .expect(200);
    expect((await prisma.jobCompany.findUniqueOrThrow({ where: { id: company.id } })).status).toBe(
      'DISABLED',
    );
  });

  it('blocks a domain, hiding its open jobs, and lets a hidden job back', async () => {
    const company = await prisma.jobCompany.create({ data: { key: 'shady', name: 'Shady' } });
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        title: 'Easy Money',
        fingerprint: 'shady|easy money|WORLDWIDE',
        category: 'OTHER',
        region: 'WORLDWIDE',
        applyUrl: 'https://apply.shady.example/jobs/1',
        applySource: 'JOBICY',
        status: 'OPEN',
        rule: 'eligible:worldwide',
        scamReasons: [],
        postedAt: new Date(),
      },
    });
    await http()
      .post('/api/v1/admin/jobs/blocks')
      .set(bearer(admin.token))
      .send({ kind: 'DOMAIN', value: 'https://shady.example/', reason: 'Fee to apply' })
      .expect(201);
    expect((await prisma.jobBlock.findFirstOrThrow({ where: { kind: 'DOMAIN' } })).value).toBe(
      'shady.example',
    );
    expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe('HIDDEN');

    const hidden = (
      await http().get('/api/v1/admin/jobs/hidden').set(bearer(admin.token)).expect(200)
    ).body as AdminHiddenJob[];
    expect(hidden.map((h) => h.title)).toEqual(['Easy Money']);
    await http()
      .patch(`/api/v1/admin/jobs/${job.id}`)
      .set(bearer(admin.token))
      .send({ status: 'OPEN' })
      .expect(200);
    expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe('OPEN');
    await http()
      .patch(`/api/v1/admin/jobs/${job.id}`)
      .set(bearer(admin.token))
      .send({ status: 'CLOSED' })
      .expect(404);
  });
});
