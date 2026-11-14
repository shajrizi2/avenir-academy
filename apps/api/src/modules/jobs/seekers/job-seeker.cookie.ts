import { JOB_SESSION_DAYS } from '@ai-academy/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { NodeEnv, type EnvironmentVariables } from '../../../config/env.validation.js';

export const JOB_SESSION_COOKIE = 'aj_session';

/** The job seeker's session cookie: httpOnly, HTTPS-only in production, one year. */
@Injectable()
export class JobSeekerCookie {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  read(req: Request): string | undefined {
    return (req.cookies as Record<string, string | undefined>)[JOB_SESSION_COOKIE];
  }

  set(res: Response, token: string): void {
    res.cookie(JOB_SESSION_COOKIE, token, {
      ...this.options(),
      maxAge: JOB_SESSION_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  clear(res: Response): void {
    res.clearCookie(JOB_SESSION_COOKIE, this.options());
  }

  private options(): CookieOptions {
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true }) || undefined;
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
      path: '/',
      ...(domain && { domain }),
    };
  }
}
