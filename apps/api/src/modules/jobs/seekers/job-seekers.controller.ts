import type { JobSeekerMe, MessageResponse, PublicJob } from '@ai-academy/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequestCodeDto, VerifyCodeDto } from '../dto/job-seeker.dto.js';
import { JobSeekerCookie } from './job-seeker.cookie.js';
import { CurrentJobSeeker, JobSeekerGuard } from './job-seeker.guard.js';
import { type Authenticated, JobSeekersService } from './job-seekers.service.js';

/** Same per-IP limit as the academy's login (AUTH_RATE_LIMIT_PER_MIN, default 10 a minute). */
const CODE_THROTTLE = {
  default: { limit: () => Number(process.env.AUTH_RATE_LIMIT_PER_MIN) || 10, ttl: 60_000 },
};

@ApiTags('job-seekers')
@Public()
@Controller('job-seekers')
export class JobSeekersController {
  constructor(
    private readonly seekers: JobSeekersService,
    private readonly cookie: JobSeekerCookie,
  ) {}

  @Throttle(CODE_THROTTLE)
  @Post('auth/request-code')
  @HttpCode(HttpStatus.OK)
  async requestCode(@Body() dto: RequestCodeDto): Promise<MessageResponse> {
    await this.seekers.requestCode(dto.email, new Date());
    return { message: 'Kodi u dërgua.' };
  }

  @Throttle(CODE_THROTTLE)
  @Post('auth/verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() dto: VerifyCodeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<JobSeekerMe> {
    const { seeker, token } = await this.seekers.verify(dto.email, dto.code, new Date());
    this.cookie.set(res, token);
    return { email: seeker.email };
  }

  @UseGuards(JobSeekerGuard)
  @Get('me')
  me(@CurrentJobSeeker() me: Authenticated): JobSeekerMe {
    return { email: me.seeker.email };
  }

  @UseGuards(JobSeekerGuard)
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentJobSeeker() me: Authenticated,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.seekers.logout(me.session.id);
    this.cookie.clear(res);
    return { message: 'Dole.' };
  }

  @UseGuards(JobSeekerGuard)
  @Post('auth/logout-everywhere')
  @HttpCode(HttpStatus.OK)
  async logoutEverywhere(
    @CurrentJobSeeker() me: Authenticated,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.seekers.logoutEverywhere(me.seeker.id);
    this.cookie.clear(res);
    return { message: 'Dole nga të gjitha pajisjet.' };
  }

  @UseGuards(JobSeekerGuard)
  @Delete('me')
  async deleteAccount(
    @CurrentJobSeeker() me: Authenticated,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.seekers.deleteAccount(me.seeker.id);
    this.cookie.clear(res);
    return { message: 'Llogaria u fshi.' };
  }

  @UseGuards(JobSeekerGuard)
  @Get('saved')
  saved(@CurrentJobSeeker() me: Authenticated): Promise<PublicJob[]> {
    return this.seekers.savedJobs(me.seeker.id);
  }

  @UseGuards(JobSeekerGuard)
  @Get('saved/ids')
  savedIds(@CurrentJobSeeker() me: Authenticated): Promise<string[]> {
    return this.seekers.savedIds(me.seeker.id);
  }

  @UseGuards(JobSeekerGuard)
  @Put('saved/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async save(@CurrentJobSeeker() me: Authenticated, @Param('jobId') jobId: string): Promise<void> {
    await this.seekers.save(me.seeker.id, jobId);
  }

  @UseGuards(JobSeekerGuard)
  @Delete('saved/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsave(
    @CurrentJobSeeker() me: Authenticated,
    @Param('jobId') jobId: string,
  ): Promise<void> {
    await this.seekers.unsave(me.seeker.id, jobId);
  }
}
