import { describe, expect, it } from 'vitest';
import { readCareerPage } from './sources/ats.js';
import { FakeJobsHttp } from './sources/fake-http.js';
import { readFeed } from './sources/feeds.js';

const http = new FakeJobsHttp({
  'https://boards-api.greenhouse.io/v1/boards/acmelabs/jobs': 'greenhouse',
  'https://api.lever.co/v0/postings/widgets': 'lever',
  'https://api.ashbyhq.com/posting-api/job-board/gadget': 'ashby',
  'https://apply.workable.com/api/v1/widget/accounts/sprocket': 'workable',
  'https://remoteok.com/api': 'remoteok',
  'https://jobicy.com/api/v2/remote-jobs': 'jobicy',
  'https://himalayas.app/jobs/api': 'himalayas',
});

describe('career-page readers', () => {
  it('reads Greenhouse, decoding its escaped HTML', async () => {
    const [job] = await readCareerPage(http, {
      name: 'Acme Labs',
      ats: 'GREENHOUSE',
      boardToken: 'acmelabs',
    });
    expect(job).toMatchObject({
      source: 'GREENHOUSE',
      externalId: '4821001',
      title: 'Senior Growth Marketer',
      company: 'Acme Labs',
      applyUrl: 'https://boards.greenhouse.io/acmelabs/jobs/4821001',
      sourceCategories: ['Marketing'],
    });
    expect(job.locationText).toContain('Remote - Europe');
    expect(job.description).toContain('Own our growth experiments.');
    expect(job.postedAt?.toISOString()).toBe('2026-11-10T14:00:00.000Z');
  });

  it('reads Lever with its workplace type, commitment and salary', async () => {
    const jobs = await readCareerPage(http, {
      name: 'Widgets',
      ats: 'LEVER',
      boardToken: 'widgets',
    });
    expect(jobs[0]).toMatchObject({
      workplace: 'remote',
      employmentType: 'Contract',
      salary: { min: 90000, max: 120000, currency: 'USD', period: 'YEAR' },
    });
    expect(jobs[0].description).toContain('5 years of Go');
    expect(jobs[1].workplace).toBe('hybrid');
  });

  it('reads Ashby and skips unlisted jobs', async () => {
    const jobs = await readCareerPage(http, { name: 'Gadget', ats: 'ASHBY', boardToken: 'gadget' });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      remote: true,
      workplace: 'remote',
      salary: { currency: 'EUR', period: 'YEAR' },
    });
  });

  it('reads Workable', async () => {
    const [job] = await readCareerPage(http, {
      name: 'Sprocket',
      ats: 'WORKABLE',
      boardToken: 'sprocket',
    });
    expect(job).toMatchObject({ externalId: 'AB12CD', remote: true });
    expect(job.locationText).toContain('Kosovo');
  });
});

describe('job-board feeds', () => {
  it('reads Remote OK, skipping its terms item and linking to the Remote OK page', async () => {
    const jobs = await readFeed(http, 'REMOTEOK');
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      source: 'REMOTEOK',
      company: 'BrightCo',
      applyUrl: 'https://remoteok.com/remote-jobs/remote-seo-specialist-brightco-100200',
    });
  });

  it('reads Jobicy, decoding entities and turning "Anywhere" into no restriction', async () => {
    const jobs = await readFeed(http, 'JOBICY');
    expect(jobs[0]).toMatchObject({
      company: 'Wordsmith & Co',
      locationText: 'EMEA',
      regions: ['EMEA'],
    });
    expect(jobs[0].sourceCategories).toEqual(['Copywriting & Content']);
    expect(jobs[1].regions).toEqual(['USA']);
  });

  it('reads Himalayas with its location restrictions', async () => {
    const jobs = await readFeed(http, 'HIMALAYAS');
    expect(jobs[0]).toMatchObject({
      regions: [],
      applyUrl: 'https://himalayas.app/companies/numbers/jobs/data-analyst',
    });
    expect(jobs[1].regions).toEqual(['Germany', 'United States']);
  });

  it('reads Himalayas country objects, time zones, the pay period and the summary', async () => {
    const jobs = await readFeed(http, 'HIMALAYAS');
    expect(jobs[2]).toMatchObject({
      regions: ['Albania', 'Kosovo'],
      timezones: [0, 1, 2],
      excerpt: 'Monitor clinical trial sites across the Balkans on a freelance basis.',
      salary: { min: 30, max: 45, currency: 'EUR', period: 'HOUR' },
    });
  });

  it('follows the Himalayas cursor to the next page', async () => {
    const page = (n: number) => ({
      jobs: Array.from({ length: n }, (_, i) => ({
        guid: `g${n}-${i}`,
        title: `Role ${i}`,
        companyName: 'Acme',
        applicationLink: `https://himalayas.app/companies/acme/jobs/${n}-${i}`,
      })),
      nextCursor: n === 20 ? 'abc==' : null,
    });
    const paged = new FakeJobsHttp({
      'https://himalayas.app/jobs/api?limit=20&cursor=abc%3D%3D': page(3),
      'https://himalayas.app/jobs/api?limit=20': page(20),
    });
    expect(await readFeed(paged, 'HIMALAYAS')).toHaveLength(23);
    expect(paged.requested).toEqual([
      'https://himalayas.app/jobs/api?limit=20',
      'https://himalayas.app/jobs/api?limit=20&cursor=abc%3D%3D',
    ]);
  });

  it('reads Jobicy three ways (latest, anywhere, Europe) without duplicates', async () => {
    const jobs = await readFeed(http, 'JOBICY');
    const ids = jobs.map((j) => j.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(http.requested).toEqual(
      expect.arrayContaining([
        'https://jobicy.com/api/v2/remote-jobs?count=100&geo=anywhere',
        'https://jobicy.com/api/v2/remote-jobs?count=100&geo=europe',
      ]),
    );
  });
});
