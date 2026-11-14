import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { EmailLogController } from './email-log.controller.js';
import { NotificationsService } from './notifications.service.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
  imports: [PaymentsModule, JobsModule],
  controllers: [EmailLogController],
  providers: [NotificationsService, SchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
