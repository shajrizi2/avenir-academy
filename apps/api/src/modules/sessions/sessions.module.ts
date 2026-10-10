import { Module } from '@nestjs/common';
import { CourseModulesModule } from '../course-modules/course-modules.module.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [CourseModulesModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
