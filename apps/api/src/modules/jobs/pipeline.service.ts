import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TRAINING_PATH } from '@ai-academy/shared';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { Job, JobCompany, JobSourceKind } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/mail.service.js';
import { jobsAlert } from '../../mail/templates.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  atsFromUrl,
  cleanTitle,
  cleanUrl,
  companyKey,
  fingerprint,
  SAME_JOB_SIMILARITY,
  titleSimilarity,
} from './dedupe.js';
import { evaluate } from './evaluate.js';
import { readCareerPage } from './sources/ats.js';
import { readFeed } from './sources/feeds.js';
import { JOBS_HTTP, type JobsHttp } from './sources/http.js';
import { hostOf, mapLimit } from './text.js';
import {
  ATS_KINDS,
  type AtsKind,
  type Decision,
  FEED_KINDS,
  type FeedKind,
  type RawPosting,
} from './types.js';

const DAY = 24 * 60 * 60 * 1000;
/** Jobs older than this are closed. */
export const MAX_AGE_DAYS = 45;
/** Apply links of jobs older than this are checked once a day. */
const LINK_CHECK_AFTER_DAYS = 7;
const LINK_CHECKS_PER_RUN = 300;
/** A career-page job missing this many runs in a row is closed. */
const MISSED_RUNS_TO_CLOSE = 2;
/** Duplicates are looked for among jobs seen in the last 30 days. */
const DEDUPE_WINDOW_DAYS = 30;
/** A feed failing this many runs in a row is paused for a week. */
const FEED_FAILS_TO_PAUSE = 3;
/** A career page failing this many runs in a row is switched off (an admin can turn it back on). */
const COMPANY_FAILS_TO_DISABLE = 5;
/** A run still marked RUNNING after this long is treated as dead. */
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

/** Which source's apply link wins when a job is on several: the company's own page first. */
const PRIORITY: Record<JobSourceKind, number> = {
  GREENHOUSE: 3,
  LEVER: 3,
  ASHBY: 3,
  WORKABLE: 3,
  HIMALAYAS: 2,
  JOBICY: 1,
  REMOTEOK: 0,
};

const CLOSED_PAGE =
  /no longer (accepting applications|available|open|active)|(job|position|posting|vacancy|role) (has )?(expired|closed|been filled|is no longer)|this job (is|has) (closed|expired)|job not found|position (has been )?filled/i;

export interface RunStats {
  sources: { name: string; ok: boolean; postings: number; error?: string }[];
  seen: number;
  created: number;
  published: number;
  rejected: Record<string, number>;
  closed: Record<string, number>;
  discovered: number;
  linkChecks: number;
}

interface SourceResult {
  name: string;
  kind: JobSourceKind;
  company?: JobCompany;
  ok: boolean;
  postings: RawPosting[];
  error?: string;
}

/**
 * The daily job collection (PLAN D36): read every source, merge duplicates, apply the remote,
 * Kosovo-eligibility and scam rules, close jobs that are gone, and log the run. Rules only, no
 * AI. Methods take `now` so tests drive them directly; the scheduler runs it at 06:00.
 */
@Injectable()
export class JobsPipelineService {
  private readonly logger = new Logger(JobsPipelineService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(JOBS_HTTP) private readonly http: JobsHttp,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  async run(now = new Date()): Promise<RunStats | null> {
    const busy = await this.prisma.jobRun.findFirst({
      where: { status: 'RUNNING', startedAt: { gt: new Date(now.getTime() - STALE_RUN_MS) } },
    });
    if (busy) {
      this.logger.warn('a job run is already in progress; skipping');
      return null;
    }
    const run = await this.prisma.jobRun.create({ data: { status: 'RUNNING', startedAt: now } });
    const stats: RunStats = {
      sources: [],
      seen: 0,
      created: 0,
      published: 0,
      rejected: {},
      closed: {},
      discovered: 0,
      linkChecks: 0,
    };
    const problems: string[] = [];
    try {
      const blocks = await this.prisma.jobBlock.findMany();
      const blockedCompanies = new Set(
        blocks.filter((b) => b.kind === 'COMPANY').map((b) => b.value),
      );
      const blockedDomains = new Set(blocks.filter((b) => b.kind === 'DOMAIN').map((b) => b.value));
      const isBlocked = (p: RawPosting) => {
        const host = hostOf(p.targetUrl ?? p.applyUrl);
        return (
          blockedCompanies.has(companyKey(p.company)) ||
          (host !== null && [...blockedDomains].some((d) => host === d || host.endsWith(`.${d}`)))
        );
      };

      // 1. Career pages first, so feed jobs that point at them find the company's own listing.
      const pages = await this.readCareerPages(now);
      const feeds = await this.readFeeds(now, problems);
      for (const result of [...pages, ...feeds]) {
        stats.sources.push({
          name: result.name,
          ok: result.ok,
          postings: result.postings.length,
          ...(result.error ? { error: result.error } : {}),
        });
      }

      // 2. Every posting: discover career pages, merge duplicates, decide, save.
      for (const result of [...pages, ...feeds]) {
        for (const posting of result.postings) {
          stats.seen++;
          stats.discovered += await this.discover(posting);
          await this.save(posting, result.company, isBlocked(posting), now, stats);
        }
      }

      // 3. Jobs gone from their career page, too old, or behind a dead link close.
      for (const result of pages) if (result.ok) await this.markMissing(result, now);
      await this.closeMissing(now, stats);
      await this.closeOld(now, stats);
      stats.linkChecks = await this.checkLinks(now, stats);

      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: { status: 'OK', finishedAt: new Date(), stats: { ...stats } },
      });
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`job run failed: ${message}`, (error as Error).stack);
      problems.push(`Mbledhja ndaloi me gabim: ${message}`);
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          stats: { ...stats },
          errors: [message],
        },
      });
    }
    if (problems.length > 0) await this.alertAdmins(problems, now);
    return stats;
  }

  // ---- Reading ----

  private async readCareerPages(now: Date): Promise<SourceResult[]> {
    const companies = await this.prisma.jobCompany.findMany({
      where: { status: 'ACTIVE', ats: { not: null }, boardToken: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    return mapLimit(companies, 5, async (company): Promise<SourceResult> => {
      const kind = company.ats as AtsKind;
      const name = `${kind}:${company.boardToken}`;
      try {
        const postings = await readCareerPage(this.http, {
          name: company.name,
          ats: kind,
          boardToken: company.boardToken as string,
          website: company.website,
        });
        // A board that suddenly lists nothing while we hold open jobs from it is treated as broken.
        if (postings.length === 0) {
          const open = await this.prisma.jobListing.count({
            where: { source: kind, job: { companyId: company.id, status: 'OPEN' } },
          });
          if (open >= 3) throw new Error(`returned no jobs but ${open} were open yesterday`);
        }
        await this.prisma.jobCompany.update({
          where: { id: company.id },
          data: { lastFetchedAt: now, failCount: 0 },
        });
        return { name, kind, company, ok: true, postings };
      } catch (error) {
        const failCount = company.failCount + 1;
        await this.prisma.jobCompany.update({
          where: { id: company.id },
          data: {
            failCount,
            ...(failCount >= COMPANY_FAILS_TO_DISABLE ? { status: 'DISABLED' as const } : {}),
          },
        });
        return { name, kind, company, ok: false, postings: [], error: (error as Error).message };
      }
    });
  }

  private async readFeeds(now: Date, problems: string[]): Promise<SourceResult[]> {
    const results: SourceResult[] = [];
    for (const kind of FEED_KINDS) {
      const feed = await this.prisma.jobFeed.upsert({
        where: { kind },
        create: { kind },
        update: {},
      });
      if (!feed.enabled || (feed.pausedUntil && feed.pausedUntil > now)) continue;
      try {
        const postings = await readFeed(this.http, kind);
        if (postings.length === 0) throw new Error('returned no jobs');
        await this.prisma.jobFeed.update({
          where: { kind },
          data: { failCount: 0, lastSuccessAt: now, lastError: null, pausedUntil: null },
        });
        results.push({ name: kind, kind, ok: true, postings });
      } catch (error) {
        const message = (error as Error).message;
        const failCount = feed.failCount + 1;
        const pause = failCount >= FEED_FAILS_TO_PAUSE;
        await this.prisma.jobFeed.update({
          where: { kind },
          data: {
            failCount: pause ? 0 : failCount,
            lastError: message,
            ...(pause ? { pausedUntil: new Date(now.getTime() + 7 * DAY) } : {}),
          },
        });
        if (pause)
          problems.push(
            `${feedName(kind)} dështoi ${failCount} herë radhazi dhe u ndal për 7 ditë (${message}).`,
          );
        results.push({ name: kind, kind, ok: false, postings: [], error: message });
      }
    }
    return results;
  }

  /** A job-board posting that links to a company's career page adds that page to the list. */
  private async discover(posting: RawPosting): Promise<number> {
    if ((ATS_KINDS as readonly string[]).includes(posting.source)) return 0;
    const board = atsFromUrl(posting.targetUrl ?? posting.applyUrl);
    if (!board) return 0;
    const known = await this.prisma.jobCompany.findUnique({
      where: { ats_boardToken: { ats: board.kind, boardToken: board.token } },
    });
    if (known) return 0;
    const key = companyKey(posting.company);
    const byName = await this.prisma.jobCompany.findUnique({ where: { key } });
    if (byName?.ats) return 0;
    if (byName) {
      await this.prisma.jobCompany.update({
        where: { id: byName.id },
        data: { ats: board.kind, boardToken: board.token, discoveredFrom: posting.source },
      });
    } else {
      await this.prisma.jobCompany.create({
        data: {
          key,
          name: posting.company,
          ats: board.kind,
          boardToken: board.token,
          discoveredFrom: posting.source,
        },
      });
    }
    return 1;
  }

  // ---- Saving ----

  private async save(
    posting: RawPosting,
    knownCompany: JobCompany | undefined,
    blocked: boolean,
    now: Date,
    stats: RunStats,
  ): Promise<void> {
    const company = knownCompany ?? (await this.companyFor(posting));
    const decision = evaluate(posting, { companyWebsite: company.website, blocked });
    if (!decision.publish) stats.rejected[decision.rule] = (stats.rejected[decision.rule] ?? 0) + 1;

    const existing = await this.prisma.jobListing.findUnique({
      where: { source_externalId: { source: posting.source, externalId: posting.externalId } },
      include: { job: true },
    });
    if (existing) {
      await this.prisma.jobListing.update({
        where: { id: existing.id },
        data: { lastSeenAt: now, missedRuns: 0, sourceUrl: posting.sourceUrl },
      });
      await this.refresh(existing.job, posting, decision, now);
      if (decision.publish) stats.published++;
      return;
    }

    const match = await this.findSameJob(posting, company, decision, now);
    if (match) {
      await this.prisma.jobListing.create({
        data: {
          jobId: match.id,
          source: posting.source,
          externalId: posting.externalId,
          sourceUrl: posting.sourceUrl,
          lastSeenAt: now,
        },
      });
      await this.refresh(match, posting, decision, now);
      if (decision.publish) stats.published++;
      return;
    }

    const region = decision.region ?? 'WORLDWIDE';
    await this.prisma.job.create({
      data: {
        companyId: company.id,
        title: posting.title.trim(),
        fingerprint: fingerprint(company.name, posting.title, decision.region ?? 'NONE'),
        category: decision.category,
        contract: decision.contract,
        region,
        locationText: posting.locationText || null,
        salaryMin: posting.salary?.min ?? null,
        salaryMax: posting.salary?.max ?? null,
        salaryCurrency: posting.salary?.currency ?? null,
        salaryPeriod: posting.salary?.period ?? null,
        applyUrl: cleanUrl(posting.applyUrl),
        applySource: posting.source,
        status: decision.publish ? 'OPEN' : 'REJECTED',
        rule: decision.rule,
        scamScore: decision.scamScore,
        scamReasons: decision.scamReasons,
        postedAt: posting.postedAt && posting.postedAt < now ? posting.postedAt : now,
        firstSeenAt: now,
        lastSeenAt: now,
        listings: {
          create: {
            source: posting.source,
            externalId: posting.externalId,
            sourceUrl: posting.sourceUrl,
            lastSeenAt: now,
          },
        },
      },
    });
    stats.created++;
    if (decision.publish) stats.published++;
  }

  private async companyFor(posting: RawPosting): Promise<JobCompany> {
    const key = companyKey(posting.company);
    return this.prisma.jobCompany.upsert({
      where: { key },
      create: {
        key,
        name: posting.company.trim(),
        website: posting.companyWebsite ?? null,
        discoveredFrom: posting.source,
      },
      update: {},
    });
  }

  /**
   * The same job from another source: the career-page job ID inside a job-board link, the
   * same company + cleaned title + region, or a title at least 90% alike at the same company.
   */
  private async findSameJob(
    posting: RawPosting,
    company: JobCompany,
    decision: Decision,
    now: Date,
  ): Promise<Job | null> {
    const board = atsFromUrl(posting.targetUrl ?? posting.applyUrl);
    if (board?.jobId && board.kind !== posting.source) {
      const listing = await this.prisma.jobListing.findUnique({
        where: { source_externalId: { source: board.kind, externalId: board.jobId } },
        include: { job: true },
      });
      if (listing) return listing.job;
    }
    const since = new Date(now.getTime() - DEDUPE_WINDOW_DAYS * DAY);
    const region = decision.region ?? 'NONE';
    const exact = await this.prisma.job.findFirst({
      where: {
        fingerprint: fingerprint(company.name, posting.title, region),
        lastSeenAt: { gte: since },
      },
    });
    if (exact) return exact;
    const title = cleanTitle(posting.title);
    const candidates = await this.prisma.job.findMany({
      where: { companyId: company.id, lastSeenAt: { gte: since } },
      select: { id: true, title: true, fingerprint: true },
    });
    const close = candidates.find(
      (c) =>
        c.fingerprint.endsWith(`|${region}`) &&
        titleSimilarity(cleanTitle(c.title), title) >= SAME_JOB_SIMILARITY,
    );
    return close ? this.prisma.job.findUnique({ where: { id: close.id } }) : null;
  }

  /** A job seen again: the best source's rules and link win; jobs that came back reopen. */
  private async refresh(
    job: Job,
    posting: RawPosting,
    decision: Decision,
    now: Date,
  ): Promise<void> {
    const leads = PRIORITY[posting.source] >= PRIORITY[job.applySource];
    const data: Record<string, unknown> = { lastSeenAt: now };
    if (leads) {
      Object.assign(data, {
        title: posting.title.trim(),
        category: decision.category,
        contract: decision.contract,
        rule: decision.rule,
        scamScore: decision.scamScore,
        scamReasons: decision.scamReasons,
        applyUrl: cleanUrl(posting.applyUrl),
        applySource: posting.source,
        locationText: posting.locationText || null,
        ...(decision.region ? { region: decision.region } : {}),
        ...(posting.salary
          ? {
              salaryMin: posting.salary.min,
              salaryMax: posting.salary.max,
              salaryCurrency: posting.salary.currency,
              salaryPeriod: posting.salary.period,
            }
          : {}),
      });
      if (job.status === 'OPEN' || job.status === 'REJECTED') {
        data.status = decision.publish ? 'OPEN' : 'REJECTED';
      } else if (
        job.status === 'CLOSED' &&
        job.closeReason === 'MISSING_FROM_SOURCE' &&
        decision.publish
      ) {
        Object.assign(data, { status: 'OPEN', closedAt: null, closeReason: null });
      }
    }
    await this.prisma.job.update({ where: { id: job.id }, data });
  }

  // ---- Closing ----

  /** Career-page listings not seen in this run count one more missed run. */
  private async markMissing(result: SourceResult, now: Date): Promise<void> {
    if (!result.company) return;
    await this.prisma.jobListing.updateMany({
      where: {
        source: result.kind,
        job: { companyId: result.company.id },
        lastSeenAt: { lt: now },
      },
      data: { missedRuns: { increment: 1 } },
    });
  }

  /**
   * A job closes when every place it was seen has been missing for 2 runs. Job-board feeds
   * only show recent jobs, so their listings never count as missing; link checks and the age
   * limit close those.
   */
  private async closeMissing(now: Date, stats: RunStats): Promise<void> {
    const gone = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
        listings: {
          every: { source: { in: [...ATS_KINDS] }, missedRuns: { gte: MISSED_RUNS_TO_CLOSE } },
        },
      },
      select: { id: true },
    });
    if (gone.length === 0) return;
    await this.prisma.job.updateMany({
      where: { id: { in: gone.map((j) => j.id) } },
      data: { status: 'CLOSED', closedAt: now, closeReason: 'MISSING_FROM_SOURCE' },
    });
    stats.closed.MISSING_FROM_SOURCE = gone.length;
  }

  private async closeOld(now: Date, stats: RunStats): Promise<void> {
    const { count } = await this.prisma.job.updateMany({
      where: { status: 'OPEN', postedAt: { lt: new Date(now.getTime() - MAX_AGE_DAYS * DAY) } },
      data: { status: 'CLOSED', closedAt: now, closeReason: 'TOO_OLD' },
    });
    if (count) stats.closed.TOO_OLD = count;
  }

  /** Opens the apply links of older jobs; a 404/410, a redirect away from the job or "no longer accepting" closes it. */
  private async checkLinks(now: Date, stats: RunStats): Promise<number> {
    const due = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
        postedAt: { lt: new Date(now.getTime() - LINK_CHECK_AFTER_DAYS * DAY) },
        OR: [
          { linkCheckedAt: null },
          { linkCheckedAt: { lt: new Date(now.getTime() - 20 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: [{ linkCheckedAt: { sort: 'asc', nulls: 'first' } }],
      take: LINK_CHECKS_PER_RUN,
      select: { id: true, applyUrl: true },
    });
    let dead = 0;
    await mapLimit(due, 5, async (job) => {
      let closed = false;
      try {
        const page = await this.http.page(job.applyUrl);
        const jobId = atsFromUrl(job.applyUrl)?.jobId;
        closed =
          page.status === 404 ||
          page.status === 410 ||
          (page.status < 400 &&
            jobId !== undefined &&
            jobId !== null &&
            !page.finalUrl.includes(jobId)) ||
          (page.status < 400 && CLOSED_PAGE.test(page.body));
      } catch {
        // Network trouble says nothing about the job; try again tomorrow.
      }
      await this.prisma.job.update({
        where: { id: job.id },
        data: closed
          ? { linkCheckedAt: now, status: 'CLOSED', closedAt: now, closeReason: 'DEAD_LINK' }
          : { linkCheckedAt: now },
      });
      if (closed) dead++;
    });
    if (dead) stats.closed.DEAD_LINK = dead;
    return due.length;
  }

  private async alertAdmins(problems: string[], now: Date): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    });
    const day = now.toISOString().slice(0, 10);
    const rendered = jobsAlert({ problems, adminUrl: `${this.webUrl}${TRAINING_PATH}/admin/jobs` });
    for (const admin of admins) {
      await this.mail.sendLogged({
        ...rendered,
        to: admin.email,
        type: 'JOBS_ALERT',
        uniqueKey: `jobs-alert:${day}:${admin.id}`,
        userId: admin.id,
      });
    }
  }
}

function feedName(kind: FeedKind): string {
  return { REMOTEOK: 'Remote OK', JOBICY: 'Jobicy', HIMALAYAS: 'Himalayas' }[kind];
}
