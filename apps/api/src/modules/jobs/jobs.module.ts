import { Module } from '@nestjs/common';
import { JobsPipelineService } from './pipeline.service.js';
import { FetchJobsHttp, JOBS_HTTP } from './sources/http.js';

/** The job board (PLAN D36): daily collection, the public list, job-seeker accounts, admin. */
@Module({
  providers: [JobsPipelineService, { provide: JOBS_HTTP, useClass: FetchJobsHttp }],
  exports: [JobsPipelineService],
})
export class JobsModule {}
