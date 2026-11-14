import type { JobBoardPage } from '@ai-academy/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { JobBoardService } from './board.service.js';
import { JobBoardQueryDto } from './dto/job-board-query.dto.js';

@ApiTags('jobs')
@Public()
@Controller('jobs')
export class JobsController {
  constructor(private readonly board: JobBoardService) {}

  /** The public list: open jobs, newest first, by category. */
  @Get()
  list(@Query() query: JobBoardQueryDto): Promise<JobBoardPage> {
    return this.board.page(query, new Date());
  }

  /** Whether "/" shows the board yet. */
  @Get('status')
  status(): Promise<{ public: boolean }> {
    return this.board.status();
  }
}
