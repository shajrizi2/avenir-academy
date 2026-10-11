import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { EnvironmentVariables } from './config/env.validation.js';

export const API_PREFIX = 'api/v1';

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
    }),
  );
  app.enableShutdownHooks();
}
