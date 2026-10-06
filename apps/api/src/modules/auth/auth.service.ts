import type { AuthResponse, MessageResponse } from '@ai-academy/shared';
import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { publicUserSelect, type PublicUserRecord } from '../users/user.select.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenService, type SignedToken } from './token.service.js';

/** API-side view of `AuthResponse` (dates are still Date objects until serialised). */
export interface AuthResult {
  body: Omit<AuthResponse, 'user'> & { user: PublicUserRecord };
  refresh: SignedToken;
}

const userWithHashSelect = { ...publicUserSelect, passwordHash: true } as const;
type UserWithHash = Prisma.UserGetPayload<{ select: typeof userWithHashSelect }>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Compared against when the email is unknown, so login timing doesn't reveal accounts. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('An account with this email already exists');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await this.hash(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: userWithHashSelect,
    });
    this.logger.log(`New student registered: ${user.id}`);
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: userWithHashSelect,
    });
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    return this.issue(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException('Session expired');
    const user = await this.prisma.user.findUnique({
      where: { id: this.tokens.peekSubject(refreshToken) },
      select: userWithHashSelect,
    });
    if (!user) throw new UnauthorizedException('Session expired');
    await this.tokens.verify(refreshToken, 'refresh', user.passwordHash);
    return this.issue(user);
  }

  /** Always answers the same way so the endpoint can't be used to discover accounts. */
  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, role: true, firstName: true, passwordHash: true },
    });
    if (user) {
      const { token, expiresIn } = await this.tokens.signReset(user);
      const link = new URL('/reset-password', this.config.get('WEB_URL', { infer: true }));
      link.searchParams.set('token', token);
      await this.mail.send({
        to: user.email,
        subject: 'Reset your AI Academy password',
        text: [
          `Hi ${user.firstName},`,
          '',
          'We received a request to reset your password. Open this link to choose a new one:',
          link.toString(),
          '',
          `The link expires in ${Math.round(expiresIn / 60)} minutes and can be used once.`,
          "If you didn't ask for this, you can ignore this email.",
        ].join('\n'),
      });
    }
    return { message: 'If an account exists for that email, we have sent a reset link.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: this.tokens.peekSubject(dto.token) },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException('This reset link is invalid or has expired');
    await this.tokens.verify(dto.token, 'reset', user.passwordHash);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await this.hash(dto.password) },
    });
    return { message: 'Your password has been updated. You can now log in.' };
  }

  private async issue(user: UserWithHash): Promise<AuthResult> {
    const [access, refresh] = await Promise.all([
      this.tokens.signAccess(user),
      this.tokens.signRefresh(user),
    ]);
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return {
      body: { accessToken: access.token, expiresIn: access.expiresIn, user: publicUser },
      refresh,
    };
  }

  private hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.get('BCRYPT_ROUNDS', { infer: true }));
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hash('dummy-password-for-timing-0');
    return this.dummyHash;
  }
}
