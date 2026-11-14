import type { FeedKind, RawPosting } from '../types.js';
import { asDate, asNumber, asString, decodeEntities, htmlToText } from '../text.js';
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
        salary:
          asNumber(j.salary_min) || asNumber(j.salary_max)
            ? {
                min: asNumber(j.salary_min),
                max: asNumber(j.salary_max),
                currency: 'USD',
                period: 'YEAR',
              }
            : null,
      } satisfies RawPosting;
    });
}

/**
 * Jobicy (https://jobicy.com/api/v2/remote-jobs). Terms: credit Jobicy and link to the job's
 * Jobicy page; check at most once an hour; don't pass the jobs on to other aggregators.
 */
async function jobicy(http: JobsHttp): Promise<RawPosting[]> {
  const data = obj(await http.json('https://jobicy.com/api/v2/remote-jobs?count=100'));
  return arr(data.jobs).map((raw) => {
    const j = obj(raw);
    const geo = decodeEntities(asString(j.jobGeo));
    const url = asString(j.url);
    return {
      source: 'JOBICY',
      externalId: asString(j.id),
      sourceUrl: url,
      applyUrl: url,
      title: decodeEntities(asString(j.jobTitle)),
      company: decodeEntities(asString(j.companyName)),
      locationText: geo,
      regions: /anywhere|worldwide/i.test(geo) ? [] : geo.split(/,\s*/).filter(Boolean),
      remote: true,
      workplace: 'remote',
      employmentType: strings(j.jobType).join(', ') || null,
      description: htmlToText(asString(j.jobDescription) || asString(j.jobExcerpt)),
      sourceCategories: strings(j.jobIndustry),
      postedAt: asDate(j.pubDate),
      salary:
        asNumber(j.annualSalaryMin) || asNumber(j.annualSalaryMax)
          ? {
              min: asNumber(j.annualSalaryMin),
              max: asNumber(j.annualSalaryMax),
              currency: asString(j.salaryCurrency) || null,
              period: 'YEAR',
            }
          : null,
    } satisfies RawPosting;
  });
}

/** Pages of 20; the newest 200 jobs are enough for a daily run. */
const HIMALAYAS_PAGES = 10;

/**
 * Himalayas (https://himalayas.app/jobs/api). Terms: show the jobs only on our own site, credit
 * Himalayas with a visible link, apply through their applicationLink, remove expired jobs.
 */
async function himalayas(http: JobsHttp): Promise<RawPosting[]> {
  const postings: RawPosting[] = [];
  for (let page = 0; page < HIMALAYAS_PAGES; page++) {
    const data = obj(
      await http.json(`https://himalayas.app/jobs/api?limit=20&offset=${page * 20}`),
    );
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
        remote: true,
        workplace: 'remote',
        employmentType: asString(j.employmentType) || null,
        description: htmlToText(asString(j.description) || asString(j.excerpt)),
        sourceCategories: [...strings(j.categories), ...strings(j.parentCategories)].map((c) =>
          c.replace(/-/g, ' '),
        ),
        postedAt: asDate(j.pubDate),
        salary:
          asNumber(j.minSalary) || asNumber(j.maxSalary)
            ? {
                min: asNumber(j.minSalary),
                max: asNumber(j.maxSalary),
                currency: asString(j.currency) || asString(j.salaryCurrency) || null,
                period: 'YEAR',
              }
            : null,
      });
    }
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
