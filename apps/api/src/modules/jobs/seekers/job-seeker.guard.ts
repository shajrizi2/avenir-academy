import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JobSeekerCookie } from './job-seeker.cookie.js';
import { type Authenticated, JobSeekersService } from './job-seekers.service.js';

type WithSeeker = Request & { jobSeeker?: Authenticated };

/** Requires a signed-in job seeker (the `aj_session` cookie); renews the cookie once a day. */
@Injectable()
export class JobSeekerGuard implements CanActivate {
  constructor(
    private readonly seekers: JobSeekersService,
    private readonly cookie: JobSeekerCookie,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<WithSeeker>();
    const res = http.getResponse<Response>();
    const auth = await this.seekers.authenticate(this.cookie.read(req), new Date());
    if (!auth) {
      throw new UnauthorizedException('Hyr me email-in tënd për të vazhduar.');
    }
    if (auth.renewed) this.cookie.set(res, this.cookie.read(req) as string);
    req.jobSeeker = auth;
    return true;
  }
}

export const CurrentJobSeeker = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Authenticated =>
    context.switchToHttp().getRequest<WithSeeker>().jobSeeker as Authenticated,
);
