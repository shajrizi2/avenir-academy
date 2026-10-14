import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { EmailLogController } from './email-log.controller.js';
import { NotificationsService } from './notifications.service.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [EmailLogController],
  providers: [NotificationsService, SchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
