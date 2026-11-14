import {
  JOB_PAGE_SIZE,
  type JobBoardPage,
  type JobCategory,
  type JobFeedSource,
  type PublicJob,
  localDateKey,
  parseDateKey,
  zonedTimeToUtc,
} from '@ai-academy/shared';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const FEEDS = new Set<string>(['REMOTEOK', 'JOBICY', 'HIMALAYAS']);

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
  applySource: true,
  postedAt: true,
  status: true,
  company: { select: { name: true } },
  listings: { select: { source: true, sourceUrl: true } },
} as const satisfies Prisma.JobSelect;

type JobRow = Prisma.JobGetPayload<{ select: typeof publicJobSelect }>;

/** A job as the board shows it; a job-board source comes with the credit its terms require. */
export function toPublicJob(job: JobRow): PublicJob {
  const credited = FEEDS.has(job.applySource)
    ? job.listings.find((l) => l.source === job.applySource)
    : undefined;
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
    credit: credited ? { source: credited.source as JobFeedSource, url: credited.sourceUrl } : null,
    open: job.status === 'OPEN',
  };
}

/** The public job list: open jobs, newest first, 30 a page, filtered by category. */
@Injectable()
export class JobBoardService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Whether "/" shows the board (the web app's proxy asks on every visit to "/", cached). */
  async status(): Promise<{ public: boolean }> {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 1 },
      select: { jobBoardPublic: true },
    });
    return { public: settings?.jobBoardPublic ?? false };
  }
}
