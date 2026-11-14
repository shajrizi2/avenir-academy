import type { JobSeekerMe, MessageResponse } from '@ai-academy/shared';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequestCodeDto, UnsubscribeDto, VerifyCodeDto } from '../dto/job-seeker.dto.js';
import { JobSeekerCookie } from './job-seeker.cookie.js';
import { CurrentJobSeeker, JobSeekerGuard } from './job-seeker.guard.js';
import { type Authenticated, JobSeekersService } from './job-seekers.service.js';

/** Same per-IP limit as the academy's login (AUTH_RATE_LIMIT_PER_MIN, default 10 a minute). */
const CODE_THROTTLE = {
  default: { limit: () => Number(process.env.AUTH_RATE_LIMIT_PER_MIN) || 10, ttl: 60_000 },
};

/**
 * Job seekers (PLAN D36, D37): the sign-in pop-up sends a code and verifies it; the session
 * then lasts a year with no sign-out on the site. Campaign emails carry an unsubscribe link.
 */
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
    const { seeker, token } = await this.seekers.verify(
      dto.email,
      dto.code,
      dto.marketingConsent,
      new Date(),
    );
    this.cookie.set(res, token);
    return { email: seeker.email };
  }

  @UseGuards(JobSeekerGuard)
  @Get('me')
  me(@CurrentJobSeeker() me: Authenticated): JobSeekerMe {
    return { email: me.seeker.email };
  }

  @Throttle(CODE_THROTTLE)
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() dto: UnsubscribeDto): Promise<MessageResponse> {
    await this.seekers.unsubscribe(dto.id, dto.token, new Date());
    return { message: 'Nuk do të marrësh më email-e nga Avenir.' };
  }
}
