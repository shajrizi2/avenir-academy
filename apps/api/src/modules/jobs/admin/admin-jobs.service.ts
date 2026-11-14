import type {
  AdminHiddenJob,
  AdminJobBlock,
  AdminJobCompany,
  AdminJobFeed,
  AdminJobRun,
  AdminJobsOverview,
} from '@ai-academy/shared';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { atsFromUrl, companyKey } from '../dedupe.js';
import { JobsPipelineService } from '../pipeline.service.js';
import { hostOf } from '../text.js';

/** What admins see and change on the job board (PLAN D36). */
@Injectable()
export class AdminJobsService {
  private readonly logger = new Logger(AdminJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: JobsPipelineService,
  ) {}

  async overview(): Promise<AdminJobsOverview> {
    const [runs, feeds, groups] = await Promise.all([
      this.prisma.jobRun.findMany({ orderBy: { startedAt: 'desc' }, take: 14 }),
      this.prisma.jobFeed.findMany({ orderBy: { kind: 'asc' } }),
      this.prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const count = (status: string) => groups.find((g) => g.status === status)?._count._all ?? 0;
    return {
      runs: runs.map((r): AdminJobRun => ({
        id: r.id,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        status: r.status as AdminJobRun['status'],
        stats: (r.stats as AdminJobRun['stats']) ?? null,
        errors: (r.errors as string[] | null) ?? null,
      })),
      feeds: feeds.map((f): AdminJobFeed => ({
        kind: f.kind as AdminJobFeed['kind'],
        enabled: f.enabled,
        failCount: f.failCount,
        lastSuccessAt: f.lastSuccessAt?.toISOString() ?? null,
        lastError: f.lastError,
        pausedUntil: f.pausedUntil?.toISOString() ?? null,
      })),
      counts: {
        open: count('OPEN'),
        rejected: count('REJECTED'),
        hidden: count('HIDDEN'),
        closed: count('CLOSED'),
      },
    };
  }

  /** Starts a run now, in the background (it takes minutes); the log shows the result. */
  runNow(): void {
    void this.pipeline.run(new Date()).catch((error: Error) => this.logger.error(error.message));
  }

  async companies(): Promise<AdminJobCompany[]> {
    const rows = await this.prisma.jobCompany.findMany({
      where: { ats: { not: null } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { jobs: { where: { status: 'OPEN' } } } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      ats: c.ats,
      boardToken: c.boardToken,
      status: c.status,
      discoveredFrom: c.discoveredFrom,
      lastFetchedAt: c.lastFetchedAt?.toISOString() ?? null,
      failCount: c.failCount,
      openJobs: c._count.jobs,
    }));
  }

  /** Adds a company by its careers link (Greenhouse, Lever, Ashby or Workable). */
  async addCompany(name: string, careersUrl: string): Promise<void> {
    const board = atsFromUrl(careersUrl);
    if (!board) {
      throw new BadRequestException(
        'Kjo lidhje nuk është nga Greenhouse, Lever, Ashby apo Workable. Ngjit lidhjen e faqes së tyre të karrierës.',
      );
    }
    const key = companyKey(name);
    const existing = await this.prisma.jobCompany.findFirst({
      where: { OR: [{ key }, { ats: board.kind, boardToken: board.token }] },
    });
    const data = {
      name: name.trim(),
      ats: board.kind,
      boardToken: board.token,
      status: 'ACTIVE' as const,
      failCount: 0,
    };
    if (existing) await this.prisma.jobCompany.update({ where: { id: existing.id }, data });
    else await this.prisma.jobCompany.create({ data: { ...data, key, discoveredFrom: 'admin' } });
  }

  async setCompanyStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<void> {
    await this.prisma.jobCompany.update({ where: { id }, data: { status, failCount: 0 } });
  }

  async blocks(): Promise<AdminJobBlock[]> {
    const rows = await this.prisma.jobBlock.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }));
  }

  /** Blocks a company name or an apply-link domain; its open jobs are hidden at once. */
  async addBlock(kind: 'COMPANY' | 'DOMAIN', raw: string, reason: string): Promise<void> {
    const value =
      kind === 'COMPANY'
        ? companyKey(raw)
        : (hostOf(raw.includes('://') ? raw : `https://${raw}`) ?? raw);
    await this.prisma.jobBlock.upsert({
      where: { kind_value: { kind, value } },
      create: { kind, value, reason },
      update: { reason },
    });
    if (kind === 'COMPANY') {
      await this.prisma.jobCompany.updateMany({
        where: { key: value },
        data: { status: 'BLOCKED' },
      });
      await this.prisma.job.updateMany({
        where: { status: 'OPEN', company: { key: value } },
        data: { status: 'HIDDEN' },
      });
    } else {
      await this.prisma.job.updateMany({
        where: {
          status: 'OPEN',
          OR: [{ applyUrl: { contains: `://${value}` } }, { applyUrl: { contains: `.${value}` } }],
        },
        data: { status: 'HIDDEN' },
      });
    }
  }

  async removeBlock(id: string): Promise<void> {
    const block = await this.prisma.jobBlock.delete({ where: { id } });
    if (block.kind === 'COMPANY') {
      await this.prisma.jobCompany.updateMany({
        where: { key: block.value, status: 'BLOCKED' },
        data: { status: 'ACTIVE' },
      });
    }
  }

  async hidden(): Promise<AdminHiddenJob[]> {
    const rows = await this.prisma.job.findMany({
      where: { status: 'HIDDEN' },
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
      include: { company: { select: { name: true } } },
    });
    return rows.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company.name,
      applyUrl: j.applyUrl,
    }));
  }

  /** Puts a hidden job back on the board or closes it for good. */
  async setHiddenJob(id: string, status: 'OPEN' | 'CLOSED', now: Date): Promise<void> {
    const job = await this.prisma.job.findFirst({ where: { id, status: 'HIDDEN' } });
    if (!job) throw new NotFoundException('Shpallja nuk u gjet mes të fshehurave.');
    await this.prisma.job.update({
      where: { id },
      data: status === 'OPEN' ? { status } : { status, closedAt: now, closeReason: 'MANUAL' },
    });
  }
}
