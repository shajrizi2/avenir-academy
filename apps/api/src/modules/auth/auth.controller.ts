import type { MessageResponse } from '@ai-academy/shared';
import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { NodeEnv, type EnvironmentVariables } from '../../config/env.validation.js';
import { REFRESH_COOKIE } from './auth.constants.js';
import { type AuthResult, AuthService } from './auth.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

/**
 * Tighter limit for credential endpoints: AUTH_RATE_LIMIT_PER_MIN (default 10) requests per
 * minute per IP. Read on each request so the e2e suites can raise it.
 */
const AUTH_THROTTLE = {
  default: { limit: () => Number(process.env.AUTH_RATE_LIMIT_PER_MIN) || 10, ttl: 60_000 },
};

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.withCookie(res, await this.auth.register(dto));
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.withCookie(res, await this.auth.login(dto));
  }

  @ApiCookieAuth(REFRESH_COOKIE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    try {
      return this.withCookie(res, await this.auth.refresh(token));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Clears the refresh cookie' })
  logout(@Res({ passthrough: true }) res: Response): MessageResponse {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { message: 'Logged out' };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    return this.auth.forgotPassword(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    return this.auth.resetPassword(dto);
  }

  private withCookie(res: Response, result: AuthResult): AuthResult['body'] {
    res.cookie(REFRESH_COOKIE, result.refresh.token, {
      ...this.cookieOptions(),
      maxAge: result.refresh.expiresIn * 1000,
    });
    return result.body;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
      path: '/',
    };
  }
}
