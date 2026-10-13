import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';

@Module({
  imports: [GroupsModule, PaymentsModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
})
export class EnrollmentsModule {}
