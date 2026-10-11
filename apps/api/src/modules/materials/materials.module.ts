import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { CourseModulesModule } from '../course-modules/course-modules.module.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';
import { LocalStorageService, S3StorageService, StorageService } from './storage.service.js';

@Module({
  imports: [CourseModulesModule],
  controllers: [MaterialsController],
  providers: [
    MaterialsService,
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        config.get('STORAGE_DRIVER', { infer: true }) === 's3'
          ? new S3StorageService(config)
          : new LocalStorageService(config),
    },
  ],
})
export class MaterialsModule {}
