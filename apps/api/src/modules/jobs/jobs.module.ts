import { Module } from '@nestjs/common';
import { AdminJobsController } from './admin/admin-jobs.controller.js';
import { AdminJobsService } from './admin/admin-jobs.service.js';
import { JobBoardService } from './board.service.js';
import { JobsController } from './jobs.controller.js';
import { JobsPipelineService } from './pipeline.service.js';
import { JobSeekerCookie } from './seekers/job-seeker.cookie.js';
import { JobSeekerGuard } from './seekers/job-seeker.guard.js';
import { JobSeekersController } from './seekers/job-seekers.controller.js';
import { JobSeekersService } from './seekers/job-seekers.service.js';
import { FetchJobsHttp, JOBS_HTTP } from './sources/http.js';

/** The job board (PLAN D36): daily collection, the public list, job-seeker accounts. */
@Module({
  controllers: [JobsController, JobSeekersController, AdminJobsController],
  providers: [
    JobsPipelineService,
    JobBoardService,
    AdminJobsService,
    JobSeekersService,
    JobSeekerCookie,
    JobSeekerGuard,
    { provide: JOBS_HTTP, useClass: FetchJobsHttp },
  ],
  exports: [JobsPipelineService, JobSeekersService],
})
export class JobsModule {}
