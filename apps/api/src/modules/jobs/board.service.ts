import {
  JOB_PAGE_SIZE,
  type JobBoardPage,
  type JobBoardStatus,
  type JobCategory,
  type PublicJob,
  localDateKey,
  parseDateKey,
  zonedTimeToUtc,
} from '@ai-academy/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type EnvironmentVariables, NodeEnv } from '../../config/env.validation.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export const publicJobSelect = {
  id: true,
  title: true,
  category: true,
  contract: true,
  region: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  salaryPeriod: true,
  applyUrl: true,
  summary: true,
  postedAt: true,
  status: true,
  company: { select: { name: true } },
} as const satisfies Prisma.JobSelect;

type JobRow = Prisma.JobGetPayload<{ select: typeof publicJobSelect }>;

/**
 * A job as the board shows it. The job boards' credit is one line under the list (their terms
 * allow a site-wide credit), and the title and "Apliko" link to the job on that board.
 */
export function toPublicJob(job: JobRow): PublicJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company.name,
    category: job.category,
    contract: job.contract,
    region: job.region,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: (job.salaryPeriod as PublicJob['salaryPeriod']) ?? null,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt.toISOString(),
    summary: job.summary,
    open: job.status === 'OPEN',
  };
}

/** The public job list: open jobs, newest first, 30 a page, filtered by category. */
@Injectable()
export class JobBoardService {
  /** Whether visitors are asked to sign in (PLAN D38): only when the codes can really be emailed. */
  private readonly signIn: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.signIn =
      config.get('MAIL_TRANSPORT', { infer: true }) === 'smtp' ||
      config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production;
  }

  async page(
    query: { q?: string; category?: JobCategory; page?: number },
    now: Date,
  ): Promise<JobBoardPage> {
    const page = query.page ?? 1;
    // Every word must appear in the title or the company name ("react berlin" finds both).
    const words = (query.q ?? '').split(/\s+/).filter(Boolean).slice(0, 8);
    const where: Prisma.JobWhereInput = {
      status: 'OPEN',
      ...(query.category ? { category: query.category } : {}),
      ...(words.length
        ? {
            AND: words.map((word) => ({
              OR: [
                { title: { contains: word, mode: 'insensitive' as const } },
                { company: { name: { contains: word, mode: 'insensitive' as const } } },
              ],
            })),
          }
        : {}),
    };
    const startOfToday = zonedTimeToUtc(parseDateKey(localDateKey(now)));
    const [settings, rows, total, totalOpen, newToday, groups] = await Promise.all([
      this.prisma.siteSettings.findUnique({ where: { id: 1 }, select: { jobBoardPublic: true } }),
      this.prisma.job.findMany({
        where,
        select: publicJobSelect,
        orderBy: [{ postedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * JOB_PAGE_SIZE,
        take: JOB_PAGE_SIZE,
      }),
      this.prisma.job.count({ where }),
      this.prisma.job.count({ where: { status: 'OPEN' } }),
      this.prisma.job.count({ where: { status: 'OPEN', firstSeenAt: { gte: startOfToday } } }),
      this.prisma.job.groupBy({
        by: ['category'],
        where: { status: 'OPEN' },
        _count: { _all: true },
      }),
    ]);
    return {
      public: settings?.jobBoardPublic ?? false,
      jobs: rows.map(toPublicJob),
      total,
      page,
      pageSize: JOB_PAGE_SIZE,
      newToday,
      totalOpen,
      categories: groups
        .map((g) => ({ category: g.category, count: g._count._all }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Whether "/" shows the board (the web app's proxy asks on every visit to "/", cached), and
   * whether the board asks visitors to sign in: never while production emails are switched off
   * (MAIL_TRANSPORT=console), or nobody could get past the pop-up.
   */
  async status(): Promise<JobBoardStatus> {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 1 },
      select: { jobBoardPublic: true },
    });
    return { public: settings?.jobBoardPublic ?? false, signIn: this.signIn };
  }
}
