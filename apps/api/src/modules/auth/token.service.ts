import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { JwtPayload, TokenPurpose } from './auth.constants.js';

interface TokenSubject {
  id: string;
  email: string;
  role: string;
  passwordHash: string;
}

export interface SignedToken {
  token: string;
  /** Lifetime in seconds. */
  expiresIn: number;
}

/**
 * Issues and verifies the three JWT kinds. Refresh and reset tokens are signed with
 * `secret + fingerprint(passwordHash)`, so changing the password invalidates all of them
 * (and makes reset tokens single-use) without a token table. See docs/PLAN.md D2.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  signAccess(user: TokenSubject): Promise<SignedToken> {
    return this.sign(user, 'access');
  }

  signRefresh(user: TokenSubject): Promise<SignedToken> {
    return this.sign(user, 'refresh');
  }

  signReset(user: TokenSubject): Promise<SignedToken> {
    return this.sign(user, 'reset');
  }

  /** Reads the subject id without verifying, so we can load the user whose hash keys the secret. */
  peekSubject(token: string): string {
    const decoded: unknown = this.jwt.decode(token);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof (decoded as JwtPayload).sub !== 'string'
    ) {
      throw new UnauthorizedException('Invalid token');
    }
    return (decoded as JwtPayload).sub;
  }

  async verify(
    token: string,
    purpose: 'refresh' | 'reset',
    passwordHash: string,
  ): Promise<JwtPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.secretFor(purpose, passwordHash),
        algorithms: ['HS256'],
      });
      if (payload.typ !== purpose) throw new Error('Wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedException(
        purpose === 'reset' ? 'This reset link is invalid or has expired' : 'Session expired',
      );
    }
  }

  private async sign(user: TokenSubject, typ: TokenPurpose): Promise<SignedToken> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, typ };
    const token = await this.jwt.signAsync(payload, {
      secret: this.secretFor(typ, user.passwordHash),
      expiresIn: this.ttlFor(typ),
      algorithm: 'HS256',
    });
    const { iat = 0, exp = 0 } = this.jwt.decode<JwtPayload>(token);
    return { token, expiresIn: exp - iat };
  }

  private secretFor(purpose: TokenPurpose, passwordHash: string): string {
    switch (purpose) {
      case 'access':
        return this.config.get('JWT_ACCESS_SECRET', { infer: true });
      case 'refresh':
        return `${this.config.get('JWT_REFRESH_SECRET', { infer: true })}.${fingerprint(passwordHash)}`;
      case 'reset':
        return `${this.config.get('JWT_RESET_SECRET', { infer: true })}.${fingerprint(passwordHash)}`;
    }
  }

  private ttlFor(purpose: TokenPurpose): JwtSignOptions['expiresIn'] {
    const key = {
      access: 'JWT_ACCESS_TTL',
      refresh: 'JWT_REFRESH_TTL',
      reset: 'JWT_RESET_TTL',
    } as const;
    return this.config.get(key[purpose], { infer: true });
  }
}

function fingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('base64url').slice(0, 22);
}
