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

  /** Where uploaded materials are stored (relative paths resolve from the API's working dir). */
  @IsString()
  UPLOAD_DIR = 'uploads';

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
