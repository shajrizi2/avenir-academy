import { execSync } from 'node:child_process';
import pg from 'pg';
import { testDatabaseUrl } from './test-database-url.js';

/** Applies migrations to the test database and empties every table before the run. */
export default async function globalSetup(): Promise<void> {
  const url = testDatabaseUrl();
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
