import {
  JOB_CODE_LENGTH,
  JOB_CODE_MINUTES,
  JOB_SESSION_DAYS,
  type PublicJob,
  type JobReportReason,
} from '@ai-academy/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { EnvironmentVariables } from '../../../config/env.validation.js';
import type { JobSeeker, JobSeekerSession } from '../../../generated/prisma/client.js';
import { MailService } from '../../../mail/mail.service.js';
import { jobLoginCode } from '../../../mail/templates.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { publicJobSelect, toPublicJob } from '../board.service.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MAX_WRONG_CODES = 5;
/** Sessions are extended (and the cookie re-sent) at most once a day. */
const RENEW_AFTER_MS = DAY;
/** Accounts unused this long are deleted (privacy notice: 2 years). */
const INACTIVE_DAYS = 730;
/** Reports that hide a job, and hidden jobs that block a company. */
export const REPORTS_TO_HIDE = 2;
export const HIDDEN_JOBS_TO_BLOCK = 3;

export interface Authenticated {
  seeker: JobSeeker;
  session: JobSeekerSession;
  /** The session was extended: send the cookie again with a fresh expiry. */
  renewed: boolean;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Job-board accounts (PLAN D36): sign in with a 6-digit code sent by email, stay signed in
 * on that device for a year (renewed on every visit). Separate from academy users.
 */
@Injectable()
export class JobSeekersService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secret = config.get('JWT_RESET_SECRET', { infer: true });
  }

  private hashCode(email: string, code: string): string {
    return createHmac('sha256', this.secret).update(`${email}:${code}`).digest('hex');
  }

  /** Sends a new code: at most 1 a minute and 5 an hour per email. */
  async requestCode(email: string, now: Date): Promise<void> {
    const [lastMinute, lastHour] = await Promise.all([
      this.prisma.jobSeekerCode.count({
        where: { email, createdAt: { gt: new Date(now.getTime() - MINUTE) } },
      }),
      this.prisma.jobSeekerCode.count({
        where: { email, createdAt: { gt: new Date(now.getTime() - 60 * MINUTE) } },
      }),
    ]);
    if (lastMinute >= 1) {
      throw new HttpException(
        'Prit një minutë para se të kërkosh një kod të ri.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (lastHour >= 5) {
      throw new HttpException(
        'Ke kërkuar shumë kode. Provo përsëri pas një ore.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = String(randomInt(0, 10 ** JOB_CODE_LENGTH)).padStart(JOB_CODE_LENGTH, '0');
    const row = await this.prisma.jobSeekerCode.create({
      data: {
        email,
        codeHash: this.hashCode(email, code),
        expiresAt: new Date(now.getTime() + JOB_CODE_MINUTES * MINUTE),
        createdAt: now,
      },
    });
    await this.mail.sendLogged({
      ...jobLoginCode({ code, minutes: JOB_CODE_MINUTES }),
      to: email,
      type: 'JOB_LOGIN_CODE',
      uniqueKey: `job-code:${row.id}`,
    });
  }

  /** Checks the latest code; on success creates the account if new and a year-long session. */
  async verify(
    email: string,
    code: string,
    now: Date,
  ): Promise<{ seeker: JobSeeker; token: string }> {
    const row = await this.prisma.jobSeekerCode.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.attempts >= MAX_WRONG_CODES) {
      throw new BadRequestException('Kodi ka skaduar. Kërko një kod të ri.');
    }
    const expected = Buffer.from(row.codeHash, 'hex');
    const given = Buffer.from(this.hashCode(email, code), 'hex');
    if (!timingSafeEqual(expected, given)) {
      await this.prisma.jobSeekerCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Kodi nuk është i saktë.');
    }
    const used = await this.prisma.jobSeekerCode.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (used.count === 0) throw new BadRequestException('Kodi ka skaduar. Kërko një kod të ri.');

    const seeker = await this.prisma.jobSeeker.upsert({
      where: { email },
      create: { email, createdAt: now, lastSeenAt: now },
      update: { lastSeenAt: now },
    });
    const token = randomBytes(32).toString('base64url');
    await this.prisma.jobSeekerSession.create({
      data: {
        jobSeekerId: seeker.id,
        tokenHash: sha256(token),
        expiresAt: new Date(now.getTime() + JOB_SESSION_DAYS * DAY),
        lastUsedAt: now,
        createdAt: now,
      },
    });
    return { seeker, token };
  }

  /** The signed-in job seeker for a session cookie, renewing the session once a day. */
  async authenticate(token: string | undefined, now: Date): Promise<Authenticated | null> {
    if (!token) return null;
    const session = await this.prisma.jobSeekerSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { jobSeeker: true },
    });
    if (!session || session.expiresAt <= now) return null;
    const { jobSeeker: seeker, ...rest } = session;
    if (now.getTime() - session.lastUsedAt.getTime() < RENEW_AFTER_MS) {
      return { seeker, session: rest, renewed: false };
    }
    const [renewed] = await this.prisma.$transaction([
      this.prisma.jobSeekerSession.update({
        where: { id: session.id },
        data: { lastUsedAt: now, expiresAt: new Date(now.getTime() + JOB_SESSION_DAYS * DAY) },
      }),
      this.prisma.jobSeeker.update({ where: { id: seeker.id }, data: { lastSeenAt: now } }),
    ]);
    return { seeker, session: renewed, renewed: true };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.jobSeekerSession.deleteMany({ where: { id: sessionId } });
  }

  async logoutEverywhere(seekerId: string): Promise<void> {
    await this.prisma.jobSeekerSession.deleteMany({ where: { jobSeekerId: seekerId } });
  }

  /** Deletes the email, sessions, saved jobs and reports at once (cascade). */
  async deleteAccount(seekerId: string): Promise<void> {
    const seeker = await this.prisma.jobSeeker.delete({ where: { id: seekerId } });
    await this.prisma.jobSeekerCode.deleteMany({ where: { email: seeker.email } });
  }

  async savedJobs(seekerId: string): Promise<PublicJob[]> {
    const saves = await this.prisma.savedJob.findMany({
      where: { jobSeekerId: seekerId },
      orderBy: { createdAt: 'desc' },
      select: { job: { select: publicJobSelect } },
    });
    return saves.map((s) => toPublicJob(s.job));
  }

  async savedIds(seekerId: string): Promise<string[]> {
    const saves = await this.prisma.savedJob.findMany({
      where: { jobSeekerId: seekerId },
      select: { jobId: true },
    });
    return saves.map((s) => s.jobId);
  }

  async save(seekerId: string, jobId: string): Promise<void> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, status: { in: ['OPEN', 'CLOSED'] } },
    });
    if (!job) throw new NotFoundException('Shpallja nuk u gjet.');
    await this.prisma.savedJob.upsert({
      where: { jobSeekerId_jobId: { jobSeekerId: seekerId, jobId } },
      create: { jobSeekerId: seekerId, jobId },
      update: {},
    });
  }

  async unsave(seekerId: string, jobId: string): Promise<void> {
    await this.prisma.savedJob.deleteMany({ where: { jobSeekerId: seekerId, jobId } });
  }

  /**
   * One report per person and job. Two reports hide the job; a company with three hidden jobs
   * goes on the blocklist, so its future jobs are never published.
   */
  async report(seekerId: string, jobId: string, reason: JobReportReason): Promise<void> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) throw new NotFoundException('Shpallja nuk u gjet.');
    await this.prisma.jobReport.upsert({
      where: { jobSeekerId_jobId: { jobSeekerId: seekerId, jobId } },
      create: { jobSeekerId: seekerId, jobId, reason },
      update: { reason },
    });
    const reports = await this.prisma.jobReport.count({ where: { jobId } });
    if (reports < REPORTS_TO_HIDE || job.status !== 'OPEN') return;
    await this.prisma.job.update({ where: { id: jobId }, data: { status: 'HIDDEN' } });
    const hidden = await this.prisma.job.count({
      where: { companyId: job.companyId, status: 'HIDDEN' },
    });
    if (hidden < HIDDEN_JOBS_TO_BLOCK) return;
    await this.prisma.$transaction([
      this.prisma.jobBlock.upsert({
        where: { kind_value: { kind: 'COMPANY', value: job.company.key } },
        create: {
          kind: 'COMPANY',
          value: job.company.key,
          reason: `${hidden} shpallje të raportuara`,
        },
        update: {},
      }),
      this.prisma.jobCompany.update({ where: { id: job.companyId }, data: { status: 'BLOCKED' } }),
      this.prisma.job.updateMany({
        where: { companyId: job.companyId, status: 'OPEN' },
        data: { status: 'HIDDEN' },
      }),
    ]);
  }

  /** Daily: old codes, expired sessions and accounts unused for 2 years go. */
  async cleanup(now: Date): Promise<number> {
    const [codes, sessions, seekers] = await this.prisma.$transaction([
      this.prisma.jobSeekerCode.deleteMany({
        where: { createdAt: { lt: new Date(now.getTime() - DAY) } },
      }),
      this.prisma.jobSeekerSession.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.jobSeeker.deleteMany({
        where: { lastSeenAt: { lt: new Date(now.getTime() - INACTIVE_DAYS * DAY) } },
      }),
    ]);
    return codes.count + sessions.count + seekers.count;
  }
}
