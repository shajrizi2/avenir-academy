import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailMessage } from '../src/mail/mail.service.js';
import { AdminJobsService } from '../src/modules/jobs/admin/admin-jobs.service.js';
import { JobsPipelineService } from '../src/modules/jobs/pipeline.service.js';
import { FakeJobsHttp } from '../src/modules/jobs/sources/fake-http.js';
import { JOBS_DIRECTORY } from '../src/modules/jobs/sources/directory.js';
import { JOBS_HTTP } from '../src/modules/jobs/sources/http.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootApp, captureMail, createUser } from './support.js';

/**
 * The daily job collection against the real database, with the internet replaced by saved
 * sample responses (test/fixtures/jobs). Runs are driven by hand with fixed dates.
 */
describe('Job collection (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pipeline: JobsPipelineService;
  let mail: MailMessage[];
  let adminEmail: string;

  const routes: Record<string, string | number | unknown[] | Record<string, unknown>> = {
    'https://boards-api.greenhouse.io/v1/boards/acmelabs/jobs': 'greenhouse',
    'https://api.lever.co/v0/postings/widgets': 'lever',
    'https://api.ashbyhq.com/posting-api/job-board/gadget': 'ashby',
    'https://apply.workable.com/api/v1/widget/accounts/sprocket': 'workable',
    'https://remoteok.com/api': 'remoteok',
    'https://jobicy.com/api/v2/remote-jobs': 'jobicy',
    'https://himalayas.app/jobs/api': 'himalayas',
    // Directory companies (PLAN D39): one linked from its careers page, one under a guessed name.
    'https://api.lever.co/v0/postings/linkedco': [],
    'https://boards-api.greenhouse.io/v1/boards/guessco/jobs': {
      jobs: [
        {
          id: 77001,
          title: 'Support Engineer',
          absolute_url: 'https://boards.greenhouse.io/guessco/jobs/77001',
          location: { name: 'Remote - Worldwide' },
          content: 'Help customers around the world.',
          updated_at: '2026-11-10T09:00:00Z',
        },
      ],
    },
  };
  const pages: Record<string, { status: number; finalUrl?: string; body?: string }> = {
    'https://linked.example/careers': {
      status: 200,
      body: '<a href="https://jobs.lever.co/linkedco?team=eng">Open roles</a>',
    },
  };
  const directory = [
    {
      name: 'Linked Co',
      website: 'https://linked.example',
      careersUrl: 'https://linked.example/careers',
    },
    {
      name: 'Guess Co',
      website: 'https://guessco.example',
      careersUrl: 'https://guessco.example/jobs',
    },
    {
      name: 'Quiet Co',
      website: 'https://quiet.example',
      careersUrl: 'https://quiet.example/jobs',
    },
  ];
  const http = new FakeJobsHttp(routes, pages);

  const job = (title: string) =>
    prisma.job.findFirstOrThrow({ where: { title }, include: { listings: true, company: true } });

  beforeAll(async () => {
    ({ app, prisma } = await bootApp((b) =>
      b
        .overrideProvider(JOBS_HTTP)
        .useValue(http)
        .overrideProvider(JOBS_DIRECTORY)
        .useValue(directory),
    ));
    pipeline = app.get(JobsPipelineService);
    mail = captureMail();
    for (const table of [
      'jobListing',
      'job',
      'jobCompany',
      'jobFeed',
      'jobRun',
      'jobBlock',
    ] as const) {
      await (prisma[table] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
    }
    const admin = await createUser(app, prisma, 'jobs-admin', 'ADMIN');
    adminEmail = (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).email;
    await prisma.jobCompany.createMany({
      data: [
        {
          key: 'acme labs',
          name: 'Acme Labs',
          ats: 'GREENHOUSE',
          boardToken: 'acmelabs',
          discoveredFrom: 'seed',
        },
        {
          key: 'widgets',
          name: 'Widgets',
          ats: 'LEVER',
          boardToken: 'widgets',
          discoveredFrom: 'seed',
        },
        {
          key: 'gadget',
          name: 'Gadget',
          ats: 'ASHBY',
          boardToken: 'gadget',
          discoveredFrom: 'seed',
        },
        {
          key: 'sprocket',
          name: 'Sprocket',
          ats: 'WORKABLE',
          boardToken: 'sprocket',
          discoveredFrom: 'seed',
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('collects every source and decides each job by the rules', async () => {
    const stats = await pipeline.run(new Date('2026-11-14T05:00:00Z'));
    expect(stats?.sources.every((s) => s.ok)).toBe(true);

    expect(await job('Senior Growth Marketer')).toMatchObject({
      status: 'OPEN',
      region: 'EUROPE',
      category: 'MARKETING',
    });
    expect(await job('Office Manager')).toMatchObject({
      status: 'REJECTED',
      rule: 'not_remote:no_signal',
    });
    // "Remote - US" with nothing saying contractors abroad are welcome (PLAN D40).
    expect(await job('Backend Engineer (Contract)')).toMatchObject({
      status: 'REJECTED',
      rule: 'not_eligible:location',
      contract: 'CONTRACTOR',
      salaryMin: 90000,
    });
    expect(await job('Account Executive')).toMatchObject({
      status: 'REJECTED',
      rule: 'not_remote:hybrid',
    });
    expect(await job('Product Designer')).toMatchObject({
      status: 'OPEN',
      region: 'WORLDWIDE',
      category: 'DESIGN',
    });
    expect(await job('Customer Support Specialist')).toMatchObject({
      status: 'OPEN',
      region: 'KOSOVO',
    });
    expect(await job('SEO Specialist')).toMatchObject({
      status: 'OPEN',
      region: 'WORLDWIDE',
      applySource: 'REMOTEOK',
    });
    expect(await job('Data Entry Assistant')).toMatchObject({ status: 'REJECTED', rule: 'scam' });
    // "EMEA" alone doesn't prove Kosovo is included (PLAN D40).
    expect(await job('Content Writer')).toMatchObject({
      status: 'REJECTED',
      rule: 'not_eligible:europe_unconfirmed',
      category: 'WRITING',
    });
    expect(await job('Sales Representative')).toMatchObject({
      status: 'REJECTED',
      rule: 'not_eligible:countries',
    });
    expect(await job('Data Analyst')).toMatchObject({
      status: 'OPEN',
      region: 'WORLDWIDE',
      category: 'AI_DATA',
    });
    // A contractor job Himalayas lists only for Germany and the US: not for Kosovo (PLAN D38).
    expect(await job('Frontend Developer')).toMatchObject({
      status: 'REJECTED',
      rule: 'not_eligible:countries',
    });
    expect(await job('Freelance Clinical Research Associate')).toMatchObject({
      status: 'OPEN',
      region: 'KOSOVO',
      salaryMin: 30,
      salaryMax: 45,
      salaryCurrency: 'EUR',
      salaryPeriod: 'HOUR',
      summary: 'Monitor clinical trial sites across the Balkans on a freelance basis.',
    });
  });

  it('adds a career page found through a job-board link to the list', async () => {
    const brightco = await prisma.jobCompany.findUniqueOrThrow({ where: { key: 'brightco' } });
    expect(brightco).toMatchObject({
      ats: 'GREENHOUSE',
      boardToken: 'brightco',
      discoveredFrom: 'REMOTEOK',
    });
  });

  it('merges the same job from other sources, keeping the company page as the apply link', async () => {
    routes['https://remoteok.com/api'] = [
      { legal: 'terms' },
      {
        id: '100300',
        epoch: 1794614400,
        company: 'Acme Labs',
        position: 'Senior Growth Marketer',
        description: '<p>Own our growth experiments.</p>',
        location: 'Europe',
        url: 'https://remoteok.com/remote-jobs/100300',
        apply_url: 'https://boards.greenhouse.io/acmelabs/jobs/4821001?utm_source=remoteok',
      },
    ];
    const jobicy = FakeJobsHttp.fixture('jobicy') as { jobs: Record<string, unknown>[] };
    routes['https://jobicy.com/api/v2/remote-jobs'] = {
      jobs: [
        ...jobicy.jobs,
        {
          id: 200001,
          url: 'https://jobicy.com/jobs/200001',
          jobTitle: 'Sr. Growth Marketer (Remote)',
          companyName: 'Acme Labs Inc.',
          jobType: ['full-time'],
          jobGeo: 'Europe',
          jobDescription: '<p>Growth. We hire through Deel.</p>',
          pubDate: '2026-11-14 08:00:00',
        },
        {
          id: 200002,
          url: 'https://jobicy.com/jobs/200002',
          jobTitle: 'Video Editor',
          companyName: 'Old Studio',
          jobType: ['full-time'],
          jobGeo: 'Anywhere',
          jobDescription: '<p>Edit videos.</p>',
          pubDate: '2026-09-01 08:00:00',
        },
      ],
    };
    routes['https://api.ashbyhq.com/posting-api/job-board/gadget'] = { jobs: [] };

    const stats = await pipeline.run(new Date('2026-11-15T05:00:00Z'));
    const marketer = await job('Senior Growth Marketer');
    expect(marketer.listings.map((l) => l.source).sort()).toEqual([
      'GREENHOUSE',
      'JOBICY',
      'REMOTEOK',
    ]);
    expect(marketer).toMatchObject({ applySource: 'GREENHOUSE', status: 'OPEN' });
    expect(await prisma.job.count({ where: { title: { contains: 'Growth Marketer' } } })).toBe(1);
    expect(await job('Video Editor')).toMatchObject({ status: 'CLOSED', closeReason: 'TOO_OLD' });
    expect(stats?.closed.TOO_OLD).toBe(1);
  });

  it('closes a career-page job after it is missing two runs in a row', async () => {
    expect((await job('Product Designer')).status).toBe('OPEN');
    routes['https://jobicy.com/api/v2/remote-jobs'] = 500;
    await pipeline.run(new Date('2026-11-16T05:00:00Z'));
    expect(await job('Product Designer')).toMatchObject({
      status: 'CLOSED',
      closeReason: 'MISSING_FROM_SOURCE',
    });
    // Job-board jobs drop out of their windowed feed without being closed.
    expect((await job('SEO Specialist')).status).toBe('OPEN');
  });

  it('pauses a feed failing three runs in a row, emails the admins, and checks old apply links', async () => {
    pages['https://himalayas.app/companies/numbers/jobs/data-analyst'] = { status: 404 };
    pages['https://boards.greenhouse.io/acmelabs/jobs/4821001'] = {
      status: 200,
      body: '<h1>Sorry, this position has been filled.</h1>',
    };
    await pipeline.run(new Date('2026-11-17T05:00:00Z'));
    const stats = await pipeline.run(new Date('2026-11-22T05:00:00Z'));

    const feed = await prisma.jobFeed.findUniqueOrThrow({ where: { kind: 'JOBICY' } });
    expect(feed.pausedUntil?.toISOString()).toBe('2026-11-29T05:00:00.000Z');
    expect(mail.some((m) => m.to === adminEmail && /Jobicy/.test(m.text))).toBe(true);

    expect(await job('Data Analyst')).toMatchObject({ status: 'CLOSED', closeReason: 'DEAD_LINK' });
    expect(await job('Senior Growth Marketer')).toMatchObject({
      status: 'CLOSED',
      closeReason: 'DEAD_LINK',
    });
    expect((await job('Customer Support Specialist')).status).toBe('OPEN');
    expect(stats?.linkChecks).toBeGreaterThan(0);
  });

  it('logs every run and never runs twice at once', async () => {
    const runs = await prisma.jobRun.findMany({ orderBy: { startedAt: 'asc' } });
    expect(runs).toHaveLength(5);
    expect(runs.every((r) => r.status === 'OK')).toBe(true);
    await prisma.jobRun.create({
      data: { status: 'RUNNING', startedAt: new Date('2026-11-23T04:59:00Z') },
    });
    expect(await pipeline.run(new Date('2026-11-23T05:00:00Z'))).toBeNull();
  });

  it('finds the careers boards of directory companies and switches off the rest', async () => {
    const company = (name: string) => prisma.jobCompany.findFirstOrThrow({ where: { name } });
    expect(await company('Linked Co')).toMatchObject({
      ats: 'LEVER',
      boardToken: 'linkedco',
      status: 'ACTIVE',
      discoveredFrom: 'directory',
    });
    expect(await company('Guess Co')).toMatchObject({ ats: 'GREENHOUSE', boardToken: 'guessco' });
    expect(await company('Quiet Co')).toMatchObject({ ats: null, status: 'DISABLED' });
    expect(await job('Support Engineer')).toMatchObject({ status: 'OPEN', region: 'WORLDWIDE' });
  });

  it('takes a company’s jobs off the board when admins say it doesn’t hire in Kosovo', async () => {
    const open = await prisma.job.findFirstOrThrow({ where: { status: 'OPEN' } });
    await app.get(AdminJobsService).setCompanyKosovo(open.companyId, 'NO');
    expect(await prisma.job.findUniqueOrThrow({ where: { id: open.id } })).toMatchObject({
      status: 'REJECTED',
      rule: 'not_eligible:company',
    });
    expect(
      await prisma.jobCompany.findUniqueOrThrow({ where: { id: open.companyId } }),
    ).toMatchObject({ hiresInKosovo: false });
  });
});
