import 'reflect-metadata';
import { type INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { type EnvironmentVariables, NodeEnv } from './config/env.validation.js';
import { REFRESH_COOKIE } from './modules/auth/auth.constants.js';
import { setupApp } from './setup-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const swagger =
    config.get('SWAGGER_ENABLED', { infer: true }) ??
    config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production;
  if (swagger) setupSwagger(app);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(
    `API ready on http://localhost:${port}/api/v1${swagger ? ' (docs: /api/docs)' : ''}`,
    'Bootstrap',
  );
}

/** The API reference at /api/docs. Off in production unless SWAGGER_ENABLED=true. */
function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Academy API')
    .setDescription('REST API for the AI Academy learning platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE)
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));
}

await bootstrap();
