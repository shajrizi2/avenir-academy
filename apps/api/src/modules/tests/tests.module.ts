import { Module } from '@nestjs/common';
import { CourseModulesModule } from '../course-modules/course-modules.module.js';
import { AttemptExpiryService } from './attempt-expiry.service.js';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';
import { TestsController } from './tests.controller.js';
import { TestsService } from './tests.service.js';

@Module({
  imports: [CourseModulesModule],
  controllers: [TestsController, AttemptsController],
  providers: [TestsService, AttemptsService, AttemptExpiryService],
})
export class TestsModule {}
