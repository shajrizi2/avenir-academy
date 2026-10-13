import { type INestApplication, type NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/i18n/validation-messages.js';
import type { EnvironmentVariables } from './config/env.validation.js';

export const API_PREFIX = 'api/v1';

/** Stripe signs the raw request body, so this route gets it untouched (see setupApp). */
export const STRIPE_WEBHOOK_PATH = `/${API_PREFIX}/payments/stripe/webhook`;

/**
 * Options for NestFactory.create / createNestApplication: Nest's default JSON parser is
 * replaced in setupApp so the Stripe webhook can keep its raw body.
 */
export const APP_OPTIONS: NestApplicationOptions = { bodyParser: false };

/** App-wide configuration shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const expressApp = app as NestExpressApplication;

  expressApp.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  expressApp.disable('x-powered-by');
  // Security headers (nosniff, frame and referrer policies, HSTS behind HTTPS, …). The API only
  // serves JSON and file downloads, so it needs no Content-Security-Policy; the web app sets one.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix(API_PREFIX);
  // Body parsing: the Stripe webhook alone receives the raw bytes (its signature covers them);
  // body-parser marks the request as parsed, so the JSON parser below leaves it alone.
  app.use(STRIPE_WEBHOOK_PATH, express.raw({ type: '*/*', limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
    // apiDownload() reads the file name when the web app calls the API cross-origin.
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableShutdownHooks();
}
