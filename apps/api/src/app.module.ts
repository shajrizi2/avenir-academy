import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { type EnvironmentVariables, validateEnv } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';
import { MailModule } from './mail/mail.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CourseModulesModule } from './modules/course-modules/course-modules.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module.js';
import { MaterialsModule } from './modules/materials/materials.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { ProgressModule } from './modules/progress/progress.module.js';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { TestimonialsModule } from './modules/testimonials/testimonials.module.js';
import { TestsModule } from './modules/tests/tests.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [
        { name: 'default', ttl: 60_000, limit: config.get('RATE_LIMIT_PER_MIN', { infer: true }) },
      ],
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    CourseModulesModule,
    SessionsModule,
    MaterialsModule,
    TestsModule,
    ProgressModule,
    StatsModule,
    SiteSettingsModule,
    TestimonialsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
