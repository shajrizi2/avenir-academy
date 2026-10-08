import { Module } from '@nestjs/common';
import { CourseModulesModule } from '../course-modules/course-modules.module.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';
import { StorageService } from './storage.service.js';

@Module({
  imports: [CourseModulesModule],
  controllers: [MaterialsController],
  providers: [MaterialsService, StorageService],
})
export class MaterialsModule {}
