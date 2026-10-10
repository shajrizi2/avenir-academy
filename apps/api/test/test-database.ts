import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';

/** API e2e tests run against a separate database so they never touch dev data. */
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set (see apps/api/.env.example)');
  }
  return url;
}

/**
 * The web (Playwright) e2e suite gets its own database: the API suite empties its database
 * when it starts, and the two may run at the same time. Defaults to the test database's
 * server with the name `ai_academy_e2e`.
 */
export function webE2eDatabaseUrl(): string {
  if (process.env.DATABASE_URL_E2E) return process.env.DATABASE_URL_E2E;
  const url = new URL(testDatabaseUrl());
  url.pathname = '/ai_academy_e2e';
  return url.toString();
}

/** Creates the database if needed, applies migrations and empties every table. */
export async function prepareDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const server = new pg.Client({ connectionString: admin.toString() });
  await server.connect();
  try {
    const { rowCount } = await server.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    // Identifiers can't be parameters; the name comes from our own config.
    if (!rowCount) await server.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
  } finally {
    await server.end();
  }

  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length > 0) {
      const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${tables} CASCADE`);
    }
  } finally {
    await client.end();
  }
}
