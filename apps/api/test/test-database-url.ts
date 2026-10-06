import 'dotenv/config';

/** e2e tests run against a separate database so they never touch dev data. */
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set (see apps/api/.env.example)');
  }
  return url;
}
