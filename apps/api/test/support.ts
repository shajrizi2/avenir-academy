import type { AuthResponse } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import type { Role } from '../src/generated/prisma/enums.js';
import { type MailMessage, MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { APP_OPTIONS, setupApp } from '../src/setup-app.js';

export const PASSWORD = 'Password123';
export const MEET = 'https://meet.google.com/abc-defg-hij';

/** Boots the whole app on the test database. `customise` can override providers. */
export async function bootApp(
  customise?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<{ app: INestApplication<App>; prisma: PrismaService }> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customise) builder = customise(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication(APP_OPTIONS);
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Registers a user through the API, promotes them if needed, and returns a bearer token. */
export async function createUser(
  app: INestApplication<App>,
  prisma: PrismaService,
  name: string,
  role: Role,
): Promise<{ id: string; email: string; token: string }> {
  const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const registered = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: PASSWORD, firstName: name, lastName: 'Tester' })
    .expect(201);
  const { id } = (registered.body as AuthResponse).user;
  if (role !== 'STUDENT') await prisma.user.update({ where: { id }, data: { role } });
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { id, email, token: (login.body as AuthResponse).accessToken };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Captures every email the app sends (the console transport is skipped). */
export function captureMail(): MailMessage[] {
  const sent: MailMessage[] = [];
  vi.spyOn(MailService.prototype, 'send').mockImplementation((message) => {
    sent.push(message);
    return Promise.resolve(true);
  });
  return sent;
}

/** Signs a Stripe event like Stripe would, with the test webhook secret from setup-env.ts. */
export function signStripeEvent(event: Record<string, unknown>): {
  payload: string;
  signature: string;
} {
  const payload = JSON.stringify(event);
  const signature = new Stripe('sk_test_fake').webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  });
  return { payload, signature };
}

export function checkoutCompletedEvent(
  sessionId: string,
  paymentId: string,
  eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
) {
  return {
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        client_reference_id: paymentId,
        payment_status: 'paid',
        payment_intent: `pi_${sessionId}`,
        metadata: { paymentId },
      },
    },
  };
}
