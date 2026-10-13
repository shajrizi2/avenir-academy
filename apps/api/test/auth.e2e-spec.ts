import type { AuthResponse, PublicUser } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, setupApp } from '../src/setup-app.js';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Password123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication(APP_OPTIONS);
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register → login → GET /users/me', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password, firstName: 'Eve', lastName: 'Tester' })
      .expect(201);
    const registerBody = registered.body as AuthResponse;
    expect(registerBody.user).toMatchObject({ email, role: 'STUDENT' });
    expect(registerBody.user).not.toHaveProperty('passwordHash');

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const { accessToken } = login.body as AuthResponse;
    expect(accessToken).toEqual(expect.any(String));
    expect(String(login.headers['set-cookie'])).toMatch(/aa_refresh=.+HttpOnly/i);

    const me = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const meBody = me.body as PublicUser;
    expect(meBody).toMatchObject({ email, firstName: 'Eve', lastName: 'Tester', role: 'STUDENT' });
    expect(meBody).not.toHaveProperty('passwordHash');
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'no-referrer',
    });
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('rejects GET /users/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('rejects a duplicate registration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Eve', lastName: 'Again' })
      .expect(409);
  });

  it('rejects unknown fields and invalid input', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
        firstName: '',
        lastName: 'X',
        role: 'ADMIN',
      })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('property role should not exist');
  });

  it('refreshes the session from the cookie and logs out', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

    const refreshed = await agent.post('/api/v1/auth/refresh').expect(200);
    expect((refreshed.body as AuthResponse).user.email).toBe(email);

    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.post('/api/v1/auth/refresh').expect(401);
  });

  it('forbids students from admin endpoints', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${(login.body as AuthResponse).accessToken}`)
      .expect(403);
  });
});
