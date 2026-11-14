import {
  type AdminCampaign,
  type AdminSubscribers,
  localDateKey,
  parseDateKey,
  zonedTimeToUtc,
} from '@ai-academy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../../config/env.validation.js';
import type { EmailCampaign } from '../../../generated/prisma/client.js';
import { MailService } from '../../../mail/mail.service.js';
import { campaignEmail } from '../../../mail/templates.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { JobSeekersService } from '../seekers/job-seekers.service.js';

/**
 * The job seekers' emails and campaigns to those who ticked "emails about opportunities"
 * (PLAN D37). Sending happens a little at a time from the scheduler (`tick`), within
 * CAMPAIGN_PER_MINUTE and CAMPAIGN_DAILY_LIMIT, so the provider's daily limit holds.
 */
@Injectable()
export class CampaignsService {
  private readonly webUrl: string;
  private readonly dailyLimit: number;
  private readonly perMinute: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly seekers: JobSeekersService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
    this.dailyLimit = config.get('CAMPAIGN_DAILY_LIMIT', { infer: true });
    this.perMinute = config.get('CAMPAIGN_PER_MINUTE', { infer: true });
  }

  // ---- Subscribers ----

  async subscribers(): Promise<AdminSubscribers> {
    const rows = await this.prisma.jobSeeker.findMany({ orderBy: { createdAt: 'desc' } });
    return {
      total: rows.length,
      consenting: rows.filter((r) => r.marketingConsent).length,
      subscribers: rows.map((r) => ({
        id: r.id,
        email: r.email,
        marketingConsent: r.marketingConsent,
        consentAt: r.consentAt?.toISOString() ?? null,
        unsubscribedAt: r.unsubscribedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
      })),
    };
  }

  /** Every stored email as CSV (Excel and Google Sheets open it). */
  async subscribersCsv(): Promise<string> {
    const { subscribers } = await this.subscribers();
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    const lines = subscribers.map((s) =>
      [
        s.email,
        s.marketingConsent ? 'po' : 'jo',
        s.createdAt.slice(0, 10),
        s.consentAt?.slice(0, 10) ?? '',
      ]
        .map(cell)
        .join(','),
    );
    return ['email,pranon_emaile,regjistruar,pranoi_me', ...lines].join('\n') + '\n';
  }

  async deleteSubscriber(id: string): Promise<void> {
    await this.seekers.deleteAccount(id);
  }

  // ---- Campaigns ----

  async list(): Promise<AdminCampaign[]> {
    const rows = await this.prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return Promise.all(rows.map((c) => this.withCounts(c)));
  }

  async create(subject: string, body: string, adminId: string): Promise<AdminCampaign> {
    const row = await this.prisma.emailCampaign.create({
      data: { subject, body, createdById: adminId },
    });
    return this.withCounts(row);
  }

  async update(id: string, subject: string, body: string): Promise<AdminCampaign> {
    await this.draft(id);
    return this.withCounts(
      await this.prisma.emailCampaign.update({ where: { id }, data: { subject, body } }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.draft(id);
    await this.prisma.emailCampaign.delete({ where: { id } });
  }

  /** Sends the campaign to one address now (the admin's own), to check how it looks. */
  async sendTest(id: string, to: string, now: Date): Promise<void> {
    const campaign = await this.find(id);
    const sent = await this.mail.sendLogged({
      ...campaignEmail({
        subject: `[Provë] ${campaign.subject}`,
        body: campaign.body,
        unsubscribeUrl: `${this.webUrl}/cregjistrohu`,
      }),
      to,
      type: 'CAMPAIGN',
      uniqueKey: `campaign-test:${id}:${now.getTime()}`,
    });
    if (sent === 'failed')
      throw new BadRequestException('Email-i i provës nuk u dërgua. Shiko ditarin e email-eve.');
  }

  /** Fixes the recipients (everyone who has ticked the box right now) and starts sending. */
  async start(id: string, now: Date): Promise<AdminCampaign> {
    await this.draft(id);
    const consenting = await this.prisma.jobSeeker.findMany({
      where: { marketingConsent: true },
      select: { id: true },
    });
    if (consenting.length === 0)
      throw new BadRequestException('Askush nuk ka pranuar ende të marrë email-e.');
    await this.prisma.$transaction([
      this.prisma.emailCampaignRecipient.createMany({
        data: consenting.map((s) => ({ campaignId: id, jobSeekerId: s.id })),
      }),
      this.prisma.emailCampaign.update({
        where: { id },
        data: { status: 'SENDING', startedAt: now },
      }),
    ]);
    return this.withCounts(await this.find(id));
  }

  /** Stops a campaign that is still sending; those already emailed stay emailed. */
  async cancel(id: string, now: Date): Promise<AdminCampaign> {
    const campaign = await this.find(id);
    if (campaign.status !== 'SENDING')
      throw new BadRequestException('Vetëm një fushatë që po dërgohet mund të ndalet.');
    return this.withCounts(
      await this.prisma.emailCampaign.update({
        where: { id },
        data: { status: 'CANCELLED', finishedAt: now },
      }),
    );
  }

  /**
   * Every minute: sends the next few emails of the campaigns being sent, never more than the
   * daily limit (counted in Europe/Tirane days). Someone who unsubscribed meanwhile is skipped.
   */
  async tick(
    now: Date,
    limits: { perMinute: number; daily: number } = {
      perMinute: this.perMinute,
      daily: this.dailyLimit,
    },
  ): Promise<number> {
    const startOfDay = zonedTimeToUtc(parseDateKey(localDateKey(now)));
    const sentToday = await this.prisma.emailCampaignRecipient.count({
      where: { sentAt: { gte: startOfDay } },
    });
    let budget = Math.min(limits.perMinute, limits.daily - sentToday);
    let sent = 0;
    const campaigns = await this.prisma.emailCampaign.findMany({
      where: { status: 'SENDING' },
      orderBy: { startedAt: 'asc' },
    });
    for (const campaign of campaigns) {
      if (budget <= 0) break;
      const batch = await this.prisma.emailCampaignRecipient.findMany({
        where: { campaignId: campaign.id, sentAt: null },
        include: { jobSeeker: true },
        take: budget,
      });
      for (const r of batch) {
        if (!r.jobSeeker.marketingConsent) {
          await this.prisma.emailCampaignRecipient.delete({
            where: {
              campaignId_jobSeekerId: { campaignId: campaign.id, jobSeekerId: r.jobSeekerId },
            },
          });
          continue;
        }
        const unsubscribeUrl = `${this.webUrl}/cregjistrohu?id=${r.jobSeekerId}&t=${this.seekers.unsubscribeToken(r.jobSeekerId)}`;
        const result = await this.mail.sendLogged({
          ...campaignEmail({ subject: campaign.subject, body: campaign.body, unsubscribeUrl }),
          to: r.jobSeeker.email,
          type: 'CAMPAIGN',
          uniqueKey: `campaign:${campaign.id}:${r.jobSeekerId}`,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
        });
        await this.prisma.emailCampaignRecipient.update({
          where: {
            campaignId_jobSeekerId: { campaignId: campaign.id, jobSeekerId: r.jobSeekerId },
          },
          data: { sentAt: now, failed: result === 'failed' },
        });
        budget--;
        sent++;
      }
      const left = await this.prisma.emailCampaignRecipient.count({
        where: { campaignId: campaign.id, sentAt: null },
      });
      if (left === 0) {
        await this.prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: { status: 'SENT', finishedAt: now },
        });
      }
    }
    return sent;
  }

  private async find(id: string): Promise<EmailCampaign> {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Fushata nuk u gjet.');
    return campaign;
  }

  private async draft(id: string): Promise<EmailCampaign> {
    const campaign = await this.find(id);
    if (campaign.status !== 'DRAFT')
      throw new BadRequestException('Kjo fushatë është dërguar tashmë.');
    return campaign;
  }

  private async withCounts(c: EmailCampaign): Promise<AdminCampaign> {
    const [recipients, sent, failed] = await Promise.all([
      this.prisma.emailCampaignRecipient.count({ where: { campaignId: c.id } }),
      this.prisma.emailCampaignRecipient.count({
        where: { campaignId: c.id, sentAt: { not: null }, failed: false },
      }),
      this.prisma.emailCampaignRecipient.count({ where: { campaignId: c.id, failed: true } }),
    ]);
    return {
      id: c.id,
      subject: c.subject,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      startedAt: c.startedAt?.toISOString() ?? null,
      finishedAt: c.finishedAt?.toISOString() ?? null,
      recipients,
      sent,
      failed,
    };
  }
}
