import type { FeedKind, RawPosting } from '../types.js';
import { normalizeSalary } from '../salary.js';
import { asDate, asString, decodeEntities, htmlToText } from '../text.js';
import type { JobsHttp } from './http.js';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strings = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : [])
    .map((x) => (typeof x === 'string' ? x : asString(obj(x).name)))
    .map((s) => decodeEntities(s).trim())
    .filter(Boolean);

/**
 * Remote OK (https://remoteok.com/api). Terms: link to the job's Remote OK page with a normal
 * (followed) link and name Remote OK as the source; no logo. The first item is the terms text.
 */
async function remoteOk(http: JobsHttp): Promise<RawPosting[]> {
  const data = await http.json('https://remoteok.com/api');
  return arr(data)
    .map(obj)
    .filter((j) => j.id && j.position)
    .map((j) => {
      const url = asString(j.url) || `https://remoteok.com/remote-jobs/${asString(j.slug)}`;
      return {
        source: 'REMOTEOK',
        externalId: asString(j.id),
        sourceUrl: url,
        applyUrl: url,
        targetUrl: asString(j.apply_url) || null,
        title: decodeEntities(asString(j.position)),
        company: decodeEntities(asString(j.company)),
        locationText: asString(j.location),
        regions: [],
        remote: true,
        workplace: 'remote',
        employmentType: null,
        description: htmlToText(asString(j.description)),
        sourceCategories: strings(j.tags),
        postedAt: asDate(j.epoch) ?? asDate(j.date),
        // Remote OK publishes yearly USD; most jobs leave it at 0.
        salary: normalizeSalary({
          min: j.salary_min,
          max: j.salary_max,
          currency: 'USD',
          period: 'annual',
        }),
      } satisfies RawPosting;
    });
}

/**
 * Jobicy (https://jobicy.com/api/v2/remote-jobs). Terms: credit Jobicy and link to the job's
 * Jobicy page; check at most once an hour; don't pass the jobs on to other aggregators.
 * The newest 100 jobs lean American, so the jobs open "anywhere" and in Europe are read too.
 */
const JOBICY_QUERIES = ['count=100', 'count=100&geo=anywhere', 'count=100&geo=europe'];

async function jobicy(http: JobsHttp): Promise<RawPosting[]> {
  const seen = new Map<string, RawPosting>();
  for (const query of JOBICY_QUERIES) {
    let data: Obj;
    try {
      data = obj(await http.json(`https://jobicy.com/api/v2/remote-jobs?${query}`));
    } catch (error) {
      // The extra queries are a bonus; only a failing main query fails the feed.
      if (query === JOBICY_QUERIES[0]) throw error;
      continue;
    }
    for (const raw of arr(data.jobs)) {
      const j = obj(raw);
      const id = asString(j.id);
      if (!id || seen.has(id)) continue;
      const geo = decodeEntities(asString(j.jobGeo));
      const url = asString(j.url);
      seen.set(id, {
        source: 'JOBICY',
        externalId: id,
        sourceUrl: url,
        applyUrl: url,
        title: decodeEntities(asString(j.jobTitle)),
        company: decodeEntities(asString(j.companyName)),
        locationText: geo,
        regions: /anywhere|worldwide/i.test(geo) ? [] : geo.split(/\s*[,;/]\s*/).filter(Boolean),
        remote: true,
        workplace: 'remote',
        employmentType: strings(j.jobType).join(', ') || null,
        description: htmlToText(asString(j.jobDescription) || asString(j.jobExcerpt)),
        excerpt: htmlToText(asString(j.jobExcerpt)),
        sourceCategories: strings(j.jobIndustry),
        postedAt: asDate(j.pubDate),
        salary: normalizeSalary({
          min: j.salaryMin ?? j.annualSalaryMin,
          max: j.salaryMax ?? j.annualSalaryMax,
          currency: j.salaryCurrency,
          period: j.salaryPeriod ?? (j.annualSalaryMin || j.annualSalaryMax ? 'annual' : null),
        }),
      });
    }
  }
  return [...seen.values()];
}

/** Pages of 20; the newest 300 jobs are enough for a daily run. */
const HIMALAYAS_PAGES = 15;

/** Himalayas time-zone restrictions: numbers or strings like "UTC+1", "-5"; junk is skipped. */
function offsets(value: unknown): number[] {
  return arr(value)
    .map((v) => (typeof v === 'number' ? v : Number(asString(v).replace(/^(utc|gmt)\s*/i, ''))))
    .filter((n) => Number.isFinite(n));
}

/**
 * Himalayas (https://himalayas.app/jobs/api). Terms: show the jobs only on our own site, credit
 * Himalayas with a visible link, apply through their applicationLink, remove expired jobs.
 * Pages follow `nextCursor` (offset is deprecated). `locationRestrictions` lists the countries
 * applicants must live in; an empty list means worldwide. Pay comes with `salaryPeriod`.
 */
async function himalayas(http: JobsHttp): Promise<RawPosting[]> {
  const postings: RawPosting[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < HIMALAYAS_PAGES; page++) {
    const url: string = cursor
      ? `https://himalayas.app/jobs/api?limit=20&cursor=${encodeURIComponent(cursor)}`
      : page === 0
        ? 'https://himalayas.app/jobs/api?limit=20'
        : `https://himalayas.app/jobs/api?limit=20&offset=${page * 20}`;
    const data = obj(await http.json(url));
    const jobs = arr(data.jobs).map(obj);
    for (const j of jobs) {
      const regions = strings(j.locationRestrictions);
      const id = asString(j.guid) || asString(j.applicationLink);
      postings.push({
        source: 'HIMALAYAS',
        externalId: id,
        sourceUrl: asString(j.guid) || asString(j.applicationLink),
        applyUrl: asString(j.applicationLink) || asString(j.guid),
        targetUrl: asString(j.applicationLink) || null,
        title: decodeEntities(asString(j.title)),
        company: decodeEntities(asString(j.companyName)),
        locationText: regions.join(', '),
        regions,
        timezones: offsets(j.timezoneRestrictions),
        remote: true,
        workplace: 'remote',
        employmentType: asString(j.employmentType) || null,
        description: htmlToText(asString(j.description) || asString(j.excerpt)),
        excerpt: htmlToText(asString(j.excerpt)),
        sourceCategories: [...strings(j.categories), ...strings(j.parentCategories)].map((c) =>
          c.replace(/-/g, ' '),
        ),
        postedAt: asDate(j.pubDate),
        salary: normalizeSalary({
          min: j.minSalary,
          max: j.maxSalary,
          currency: j.currency ?? j.salaryCurrency,
          period: j.salaryPeriod ?? 'annual',
        }),
      });
    }
    cursor = asString(data.nextCursor) || null;
    if (jobs.length < 20) break;
  }
  return postings;
}

const READERS: Record<FeedKind, (http: JobsHttp) => Promise<RawPosting[]>> = {
  REMOTEOK: remoteOk,
  JOBICY: jobicy,
  HIMALAYAS: himalayas,
};

/** The recent jobs on one remote job board. Postings without an ID, title or company are dropped. */
export async function readFeed(http: JobsHttp, kind: FeedKind): Promise<RawPosting[]> {
  const postings = await READERS[kind](http);
  return postings.filter((p) => p.externalId && p.title && p.company && p.applyUrl);
}

/** How each feed must be credited on the board (their terms). */
export const FEED_CREDITS: Record<FeedKind, { name: string; url: string }> = {
  REMOTEOK: { name: 'Remote OK', url: 'https://remoteok.com' },
  JOBICY: { name: 'Jobicy', url: 'https://jobicy.com' },
  HIMALAYAS: { name: 'Himalayas', url: 'https://himalayas.app' },
};
