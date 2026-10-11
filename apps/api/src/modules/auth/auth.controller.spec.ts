import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { NodeEnv, type EnvironmentVariables } from '../../config/env.validation.js';
import { AuthController } from './auth.controller.js';
import type { AuthResult, AuthService } from './auth.service.js';

function controllerWith(env: Partial<EnvironmentVariables>) {
  const result = { body: {}, refresh: { token: 'refresh-token', expiresIn: 60 } } as AuthResult;
  const auth = { login: () => Promise.resolve(result) } as unknown as AuthService;
  const config = {
    get: (key: keyof EnvironmentVariables) => env[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
  return new AuthController(auth, config);
}

async function cookieAfterLogin(env: Partial<EnvironmentVariables>) {
  const res = { cookie: vi.fn() };
  await controllerWith(env).login(
    { email: 'a@example.com', password: 'x' },
    res as unknown as Response,
  );
  return res.cookie.mock.calls[0] as [string, string, Record<string, unknown>];
}

describe('AuthController refresh cookie', () => {
  it('is Secure, HttpOnly, SameSite=Lax and shared with the web host in production', async () => {
    const [name, value, options] = await cookieAfterLogin({
      NODE_ENV: NodeEnv.Production,
      COOKIE_DOMAIN: '.avenir.academy',
    });
    expect(name).toBe('aa_refresh');
    expect(value).toBe('refresh-token');
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: '.avenir.academy',
      maxAge: 60_000,
    });
  });

  it('is host-only and not Secure in development', async () => {
    const [, , options] = await cookieAfterLogin({ NODE_ENV: NodeEnv.Development });
    expect(options.secure).toBe(false);
    expect(options).not.toHaveProperty('domain');
  });
});
