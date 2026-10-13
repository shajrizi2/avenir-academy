import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Global guard: every route needs a valid access token unless marked @Public().
 * On public routes a valid token is still decoded so handlers can tailor the response
 * (e.g. admins see unpublished courses), but a missing or invalid token is not an error.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.isPublic(context)) {
      return (await super.canActivate(context)) as boolean;
    }
    try {
      await super.canActivate(context);
    } catch {
      // Anonymous access is fine on public routes.
    }
    return true;
  }

  handleRequest<TUser>(err: unknown, user: TUser, info: unknown, context: ExecutionContext): TUser {
    if (this.isPublic(context)) {
      return (user || undefined) as TUser;
    }
    if (err || !user) {
      throw err instanceof Error && !(err instanceof UnauthorizedException)
        ? err
        : new UnauthorizedException('Duhet të hysh për të vazhduar');
    }
    return user;
  }
}
