import type { AuthResponse, PublicInstructor, SiteSettings } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';

describe('Landing content (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves site settings publicly, with defaults before any are saved', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/site-settings').expect(200);
    expect((res.body as SiteSettings).priceCurrency).toBe('EUR');
  });

  it('only lets admins change site settings', async () => {
    const student = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `landing-${Date.now()}@example.com`,
        password: 'Password123',
        firstName: 'Lena',
        lastName: 'Student',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/site-settings')
      .set('Authorization', `Bearer ${(student.body as AuthResponse).accessToken}`)
      .send({ seatsTotal: 10 })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/v1/site-settings')
      .send({ seatsTotal: 10 })
      .expect(401);
  });

  it('lists instructors without private fields', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/instructors').expect(200);
    for (const instructor of res.body as PublicInstructor[]) {
      expect(instructor).not.toHaveProperty('email');
      expect(instructor).not.toHaveProperty('passwordHash');
    }
  });

  it('lists published testimonials and validates the locale', async () => {
    await request(app.getHttpServer()).get('/api/v1/testimonials?locale=sq').expect(200);
    await request(app.getHttpServer()).get('/api/v1/testimonials?locale=de').expect(400);
  });
});
