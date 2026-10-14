import { DEFAULT_TIMEZONE } from '@ai-academy/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { PaymentsService } from '../payments/payments.service.js';
import { NotificationsService } from './notifications.service.js';

/**
 * The cron schedule, in Europe/Tirane. Each job is a thin wrapper: the work (and the
 * idempotency) lives in the services, which the tests call directly. CRON_ENABLED=false
 * (tests) turns the timers into no-ops.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
  ) {
    this.enabled = config.get('CRON_ENABLED', { infer: true });
  }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: DEFAULT_TIMEZONE })
  async expireHolds(): Promise<void> {
    await this.run('expire holds', () => this.payments.expireHolds());
  }

  @Cron('*/5 * * * *', { timeZone: DEFAULT_TIMEZONE })
  async lectureReminders(): Promise<void> {
    await this.run('lecture reminders', () => this.notifications.sendLectureReminders());
  }

  @Cron('0 9 * * *', { timeZone: DEFAULT_TIMEZONE })
  async offlineLearning(): Promise<void> {
    await this.run('offline-learning emails', () => this.notifications.sendOfflineLearningEmails());
  }

  @Cron(CronExpression.EVERY_HOUR, { timeZone: DEFAULT_TIMEZONE })
  async warnExpiringHolds(): Promise<void> {
    await this.run('hold warnings', () => this.payments.warnExpiringHolds());
  }

  @Cron('5 0 * * *', { timeZone: DEFAULT_TIMEZONE })
  async groupStatuses(): Promise<void> {
    await this.run('group statuses', () => this.notifications.refreshGroupStatuses());
  }

  private async run(name: string, job: () => Promise<number | void>): Promise<void> {
    if (!this.enabled) return;
    try {
      const result = await job();
      if (typeof result === 'number' && result > 0) this.logger.log(`${name}: ${result}`);
    } catch (error) {
      this.logger.error(`${name} failed`, (error as Error).stack);
    }
  }
}
