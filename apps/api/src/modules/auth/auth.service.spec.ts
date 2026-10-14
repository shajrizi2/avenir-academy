import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { MailService } from '../../mail/mail.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';

const env: Partial<EnvironmentVariables> = {
  WEB_URL: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_RESET_SECRET: 's'.repeat(32),
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  JWT_RESET_TTL: '30m',
  BCRYPT_ROUNDS: 4,
};
const config = {
  get: (key: keyof EnvironmentVariables) => env[key],
} as unknown as ConfigService<EnvironmentVariables, true>;

function makeUser(passwordHash: string) {
  return {
    id: 'user_1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: null,
    role: 'STUDENT' as const,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    passwordHash,
  };
}

describe('AuthService', () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let mail: { sendLogged: ReturnType<typeof vi.fn> };
  let tokens: TokenService;
  let service: AuthService;
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await bcrypt.hash('secret123', 4);
    prisma = { user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } };
    mail = { sendLogged: vi.fn().mockResolvedValue('sent') };
    tokens = new TokenService(new JwtService({}), config);
    service = new AuthService(
      prisma as unknown as PrismaService,
      tokens,
      mail as unknown as MailService,
      config,
    );
  });

  describe('register', () => {
    const dto = {
      email: 'ada@example.com',
      password: 'secret123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    it('hashes the password, creates a student and returns tokens without the hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: { data: { passwordHash: string } }) =>
        Promise.resolve(makeUser(data.passwordHash)),
      );

      const result = await service.register(dto);

      const created = prisma.user.create.mock.calls[0][0].data as { passwordHash: string };
      expect(created.passwordHash).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, created.passwordHash)).toBe(true);
      expect(result.body.user).not.toHaveProperty('passwordHash');
      expect(result.body.user.email).toBe(dto.email);
      expect(result.body.accessToken).toEqual(expect.any(String));
      expect(result.body.expiresIn).toBe(15 * 60);
      expect(result.refresh.expiresIn).toBe(7 * 24 * 60 * 60);
    });

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(passwordHash));
      const result = await service.login({ email: 'ada@example.com', password: 'secret123' });
      expect(result.body.user.id).toBe('user_1');
      expect(result.body.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(passwordHash));
      await expect(
        service.login({ email: 'ada@example.com', password: 'wrong-pass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email with the same error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'secret123' }),
      ).rejects.toThrow('Email-i ose fjalëkalimi është i gabuar');
    });
  });

  describe('refresh', () => {
    it('issues new tokens for a valid refresh token', async () => {
      const user = makeUser(passwordHash);
      prisma.user.findUnique.mockResolvedValue(user);
      const { token } = await tokens.signRefresh(user);

      const result = await service.refresh(token);
      expect(result.body.user.id).toBe(user.id);
    });

    it('rejects a missing token', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an access token used as a refresh token', async () => {
      const user = makeUser(passwordHash);
      prisma.user.findUnique.mockResolvedValue(user);
      const { token } = await tokens.signAccess(user);
      await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects refresh tokens issued before a password change', async () => {
      const user = makeUser(passwordHash);
      const { token } = await tokens.signRefresh(user);
      prisma.user.findUnique.mockResolvedValue(makeUser(await bcrypt.hash('changed123', 4)));
      await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('emails a reset link when the account exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(passwordHash));
      const res = await service.forgotPassword({ email: 'ada@example.com' });
      expect(mail.sendLogged).toHaveBeenCalledOnce();
      const message = mail.sendLogged.mock.calls[0][0] as { to: string; text: string };
      expect(message.to).toBe('ada@example.com');
      expect(message.text).toContain('http://localhost:3000/reset-password?token=');
      expect(res.message).toMatch(/Nëse ekziston një llogari/);
    });

    it('answers identically without sending mail for unknown emails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'nobody@example.com' });
      expect(mail.sendLogged).not.toHaveBeenCalled();
      expect(res.message).toMatch(/Nëse ekziston një llogari/);
    });
  });

  describe('resetPassword', () => {
    it('updates the password hash for a valid token', async () => {
      const user = makeUser(passwordHash);
      prisma.user.findUnique.mockResolvedValue(user);
      const { token } = await tokens.signReset(user);

      await service.resetPassword({ token, password: 'newpass123' });

      const { data } = prisma.user.update.mock.calls[0][0] as { data: { passwordHash: string } };
      expect(await bcrypt.compare('newpass123', data.passwordHash)).toBe(true);
    });

    it('rejects a token that was already used (password hash changed)', async () => {
      const user = makeUser(passwordHash);
      const { token } = await tokens.signReset(user);
      prisma.user.findUnique.mockResolvedValue(makeUser(await bcrypt.hash('newpass123', 4)));
      await expect(service.resetPassword({ token, password: 'another123' })).rejects.toThrow(
        'Kjo lidhje nuk është e vlefshme ose ka skaduar',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a refresh token used as a reset token', async () => {
      const user = makeUser(passwordHash);
      prisma.user.findUnique.mockResolvedValue(user);
      const { token } = await tokens.signRefresh(user);
      await expect(service.resetPassword({ token, password: 'another123' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
