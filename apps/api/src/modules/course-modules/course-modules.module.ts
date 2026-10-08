import { Module } from '@nestjs/common';
import { CourseModulesController } from './course-modules.controller.js';
import { CourseModulesService } from './course-modules.service.js';
import { ModuleAccessService } from './module-access.service.js';

@Module({
  controllers: [CourseModulesController],
  providers: [CourseModulesService, ModuleAccessService],
  exports: [ModuleAccessService],
})
export class CourseModulesModule {}
