import type { AtsKind, RawPosting, Salary } from '../types.js';
import { asDate, asNumber, asString, htmlToText } from '../text.js';
import { normalizeSalary } from '../salary.js';
import type { JobsHttp } from './http.js';

/** A company whose career page is read directly. */
export interface AtsCompany {
  name: string;
  ats: AtsKind;
  boardToken: string;
  website?: string | null;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const names = (v: unknown): string[] =>
  arr(v)
    .map((x) => (typeof x === 'string' ? x : asString(obj(x).name ?? obj(x).location)))
    .filter(Boolean);

function workplace(value: unknown): RawPosting['workplace'] {
  const v = asString(value)
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (v === 'remote') return 'remote';
  if (v === 'hybrid') return 'hybrid';
  if (v === 'onsite' || v === 'inoffice' || v === 'office') return 'onsite';
  return null;
}

function period(value: unknown): Salary['period'] {
  const v = asString(value).toLowerCase();
  if (/hour/.test(v)) return 'HOUR';
  if (/month/.test(v)) return 'MONTH';
  if (/week/.test(v)) return 'WEEK';
  if (/year|annual|salary/.test(v)) return 'YEAR';
  return null;
}

/** https://developers.greenhouse.io/job-board.html */
async function greenhouse(http: JobsHttp, c: AtsCompany): Promise<RawPosting[]> {
  const token = encodeURIComponent(c.boardToken);
  const data = obj(
    await http.json(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`),
  );
  return arr(data.jobs).map((raw) => {
    const j = obj(raw);
    const url = asString(j.absolute_url);
    return {
      source: 'GREENHOUSE',
      externalId: asString(j.id),
      sourceUrl: url,
      applyUrl: url,
      title: asString(j.title),
      company: c.name,
      companyWebsite: c.website ?? null,
      locationText: [asString(obj(j.location).name), ...names(j.offices)]
        .filter(Boolean)
        .join(' | '),
      regions: [],
      remote: null,
      workplace: null,
      employmentType: null,
      description: htmlToText(asString(j.content)),
      sourceCategories: names(j.departments),
      postedAt: asDate(j.first_published) ?? asDate(j.updated_at),
      salary: null,
    } satisfies RawPosting;
  });
}

/** https://github.com/lever/postings-api */
async function lever(http: JobsHttp, c: AtsCompany): Promise<RawPosting[]> {
  const site = encodeURIComponent(c.boardToken);
  const data = await http.json(`https://api.lever.co/v0/postings/${site}?mode=json`);
  return arr(data).map((raw) => {
    const j = obj(raw);
    const cat = obj(j.categories);
    const range = obj(j.salaryRange);
    const lists = arr(j.lists)
      .map((l) => `${asString(obj(l).text)}\n${htmlToText(asString(obj(l).content))}`)
      .join('\n');
    return {
      source: 'LEVER',
      externalId: asString(j.id),
      sourceUrl: asString(j.hostedUrl),
      applyUrl: asString(j.hostedUrl) || asString(j.applyUrl),
      title: asString(j.text),
      company: c.name,
      companyWebsite: c.website ?? null,
      locationText: [asString(cat.location), ...names(cat.allLocations)]
        .filter(Boolean)
        .join(' | '),
      regions: [],
      remote: null,
      workplace: workplace(j.workplaceType),
      employmentType: asString(cat.commitment) || null,
      description: [asString(j.descriptionPlain), lists, asString(j.additionalPlain)].join('\n'),
      sourceCategories: [asString(cat.team), asString(cat.department)].filter(Boolean),
      postedAt: asDate(j.createdAt),
      salary:
        range.min || range.max
          ? {
              min: asNumber(range.min),
              max: asNumber(range.max),
              currency: asString(range.currency) || null,
              period: period(range.interval),
            }
          : null,
    } satisfies RawPosting;
  });
}

/** https://developers.ashbyhq.com/docs/public-job-posting-api */
async function ashby(http: JobsHttp, c: AtsCompany): Promise<RawPosting[]> {
  const name = encodeURIComponent(c.boardToken);
  const data = obj(
    await http.json(
      `https://api.ashbyhq.com/posting-api/job-board/${name}?includeCompensation=true`,
    ),
  );
  return arr(data.jobs)
    .map(obj)
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const salary = arr(obj(j.compensation).summaryComponents)
        .map(obj)
        .find((s) => /salary/i.test(asString(s.compensationType)));
      return {
        source: 'ASHBY',
        externalId: asString(j.id),
        sourceUrl: asString(j.jobUrl),
        applyUrl: asString(j.jobUrl) || asString(j.applyUrl),
        title: asString(j.title),
        company: c.name,
        companyWebsite: c.website ?? null,
        locationText: [asString(j.location), ...names(j.secondaryLocations)]
          .filter(Boolean)
          .join(' | '),
        regions: [],
        remote: typeof j.isRemote === 'boolean' ? j.isRemote : null,
        workplace: workplace(j.workplaceType),
        employmentType: asString(j.employmentType) || null,
        description: asString(j.descriptionPlain) || htmlToText(asString(j.descriptionHtml)),
        sourceCategories: [asString(j.department), asString(j.team)].filter(Boolean),
        postedAt: asDate(j.publishedAt),
        salary: salary
          ? {
              min: asNumber(salary.minValue),
              max: asNumber(salary.maxValue),
              currency: asString(salary.currencyCode) || null,
              period: period(salary.interval),
            }
          : null,
      } satisfies RawPosting;
    });
}

/** Workable's public careers widget feed. */
async function workable(http: JobsHttp, c: AtsCompany): Promise<RawPosting[]> {
  const account = encodeURIComponent(c.boardToken);
  const data = obj(
    await http.json(`https://apply.workable.com/api/v1/widget/accounts/${account}?details=true`),
  );
  return arr(data.jobs).map((raw) => {
    const j = obj(raw);
    const places = arr(j.locations)
      .map(obj)
      .map((l) =>
        [asString(l.city), asString(l.region), asString(l.country)].filter(Boolean).join(', '),
      );
    const own = [asString(j.city), asString(j.state), asString(j.country)]
      .filter(Boolean)
      .join(', ');
    const url = asString(j.url) || asString(j.shortlink);
    return {
      source: 'WORKABLE',
      externalId: asString(j.shortcode) || asString(j.id),
      sourceUrl: url,
      applyUrl: url || asString(j.application_url),
      title: asString(j.title),
      company: c.name,
      companyWebsite: c.website ?? null,
      locationText: [own, ...places].filter(Boolean).join(' | '),
      regions: [],
      remote: typeof j.telecommuting === 'boolean' ? j.telecommuting : null,
      workplace: workplace(j.workplace),
      employmentType: asString(j.employment_type) || null,
      description: htmlToText(asString(j.description)),
      sourceCategories: [asString(j.department), asString(j.function)].filter(Boolean),
      postedAt: asDate(j.published_on) ?? asDate(j.created_at),
      salary: null,
    } satisfies RawPosting;
  });
}

const READERS: Record<AtsKind, (http: JobsHttp, c: AtsCompany) => Promise<RawPosting[]>> = {
  GREENHOUSE: greenhouse,
  LEVER: lever,
  ASHBY: ashby,
  WORKABLE: workable,
};

/** Every open job on one company's career page. Postings without an ID or title are dropped. */
export async function readCareerPage(http: JobsHttp, company: AtsCompany): Promise<RawPosting[]> {
  const postings = await READERS[company.ats](http, company);
  return postings
    .filter((p) => p.externalId && p.title && p.applyUrl)
    .map((p) => ({ ...p, salary: p.salary && normalizeSalary(p.salary) }));
}
