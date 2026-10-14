import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  PORT = 4000;

  @IsString()
  DATABASE_URL: string;

  @IsUrl({ require_tld: false })
  WEB_URL = 'http://localhost:3000';

  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  /** Express "trust proxy" setting; the Next.js rewrite proxy runs on loopback. */
  @IsString()
  TRUST_PROXY = 'loopback';

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_RESET_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsString()
  JWT_RESET_TTL = '30m';

  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS = 12;

  /** Requests per minute per IP for the global rate limit. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_PER_MIN = 120;

  /** Requests per minute per IP for login, register and password resets. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_PER_MIN = 10;

  /** Serve the Swagger UI at /api/docs. Defaults to on, except in production. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  /**
   * Domain attribute of the refresh cookie. Empty = host-only (development, same-origin proxy).
   * In production `.avenir.academy`, so the web app (proxy.ts) sees the cookie the API sets.
   */
  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  /** `local` stores materials under UPLOAD_DIR; `s3` in an S3-compatible bucket (R2). */
  @IsIn(['local', 's3'])
  STORAGE_DRIVER: 'local' | 's3' = 'local';

  /** Where uploaded materials are stored (relative paths resolve from the API's working dir). */
  @IsString()
  UPLOAD_DIR = 'uploads';

  /** R2: https://<account-id>.r2.cloudflarestorage.com */
  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3')
  @IsUrl({ require_tld: false, require_protocol: true })
  S3_ENDPOINT?: string;

  /** R2 uses `auto`. */
  @IsString()
  S3_REGION = 'auto';

  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3')
  @IsString()
  @MinLength(1, { message: 'S3_BUCKET is required when STORAGE_DRIVER=s3' })
  S3_BUCKET?: string;

  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3')
  @IsString()
  @MinLength(1, { message: 'S3_ACCESS_KEY_ID is required when STORAGE_DRIVER=s3' })
  S3_ACCESS_KEY_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3')
  @IsString()
  @MinLength(1, { message: 'S3_SECRET_ACCESS_KEY is required when STORAGE_DRIVER=s3' })
  S3_SECRET_ACCESS_KEY?: string;

  /** Optional key prefix inside the bucket, e.g. `materials/`. */
  @IsString()
  S3_PREFIX = '';

  /** Path-style URLs (needed by MinIO for local testing; R2 works either way). */
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  S3_FORCE_PATH_STYLE = false;

  /** `console` writes emails to the log (development); `smtp` sends them (production). */
  @IsIn(['console', 'smtp'])
  MAIL_TRANSPORT: 'console' | 'smtp' = 'console';

  /** Sender shown to recipients, e.g. `AI Academy <no-reply@example.com>`. */
  @IsString()
  MAIL_FROM = 'AI Academy <no-reply@localhost>';

  @ValidateIf((env: EnvironmentVariables) => env.MAIL_TRANSPORT === 'smtp')
  @IsString()
  @MinLength(1, { message: 'SMTP_HOST is required when MAIL_TRANSPORT=smtp' })
  SMTP_HOST?: string;

  @Type(() => Number)
  @IsInt()
  SMTP_PORT = 587;

  /** true for implicit TLS (port 465); false uses STARTTLS when the server offers it. */
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  SMTP_SECURE = false;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  /**
   * Card payments through Stripe Checkout. In production the keys must be set while Stripe
   * is enabled (the app refuses to start otherwise); in development they may be left empty,
   * and card checkout then answers 503. Admins can also switch Stripe off in site settings.
   */
  @Transform(({ value }: { value: unknown }) => value !== false && value !== 'false')
  @IsBoolean()
  STRIPE_ENABLED = true;

  @ValidateIf(
    (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production && env.STRIPE_ENABLED,
  )
  @IsString()
  @MinLength(1, {
    message: 'STRIPE_SECRET_KEY is required in production while STRIPE_ENABLED=true',
  })
  STRIPE_SECRET_KEY?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production && env.STRIPE_ENABLED,
  )
  @IsString()
  @MinLength(1, {
    message: 'STRIPE_WEBHOOK_SECRET is required in production while STRIPE_ENABLED=true',
  })
  STRIPE_WEBHOOK_SECRET?: string;

  /**
   * Tests and local runs without keys: a fake Stripe client (no network) whose checkout goes
   * straight to the success page. Refused in production.
   */
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production)
  @IsIn([false], { message: 'STRIPE_FAKE must not be set in production' })
  STRIPE_FAKE = false;

  /** Scheduled jobs (reminders, offline emails, hold expiry). Off in tests, where they run by hand. */
  @Transform(({ value }: { value: unknown }) => value !== false && value !== 'false')
  @IsBoolean()
  CRON_ENABLED = true;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return validated;
}
