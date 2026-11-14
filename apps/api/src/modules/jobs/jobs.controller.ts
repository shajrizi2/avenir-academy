import type { JobBoardPage, MessageResponse } from '@ai-academy/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { JobBoardService } from './board.service.js';
import { JobBoardQueryDto } from './dto/job-board-query.dto.js';
import { ReportJobDto } from './dto/job-seeker.dto.js';
import { CurrentJobSeeker, JobSeekerGuard } from './seekers/job-seeker.guard.js';
import { type Authenticated, JobSeekersService } from './seekers/job-seekers.service.js';

@ApiTags('jobs')
@Public()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly board: JobBoardService,
    private readonly seekers: JobSeekersService,
  ) {}

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

  @UseGuards(JobSeekerGuard)
  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  async report(
    @Param('id') id: string,
    @Body() dto: ReportJobDto,
    @CurrentJobSeeker() me: Authenticated,
  ): Promise<MessageResponse> {
    await this.seekers.report(me.seeker.id, id, dto.reason);
    return { message: 'Faleminderit, e shqyrtojmë.' };
  }
}
