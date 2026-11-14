/**
 * Starts the built API for the web (Playwright) e2e suite: a fresh, seeded `ai_academy_e2e`
 * database, relaxed rate limits and a throwaway upload folder. Playwright runs this as a web
 * server (apps/web/playwright.config.ts), passing PORT and WEB_URL; run `pnpm build` first.
 */
import { execSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import pg from 'pg';
import { prepareDatabase, webE2eDatabaseUrl } from './test-database.js';

const url = webE2eDatabaseUrl();
await prepareDatabase(url);
execSync('pnpm exec prisma db seed', {
  env: { ...process.env, DATABASE_URL: url },
  stdio: 'inherit',
});

// A few job-board jobs (PLAN D36); the board itself stays switched off, so tests use /?preview.
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query(
  `INSERT INTO "JobCompany" (id, key, name) VALUES ('e2e-co', 'e2e labs', 'E2E Labs')`,
);
const jobs: [string, string, string, string, string, string][] = [
  ['e2e-job-1', 'Growth Marketer', 'MARKETING', 'EUROPE', 'REMOTEOK', 'OPEN'],
  ['e2e-job-2', 'Backend Engineer', 'ENGINEERING', 'WORLDWIDE', 'GREENHOUSE', 'OPEN'],
  ['e2e-job-3', 'Old Role', 'DESIGN', 'WORLDWIDE', 'GREENHOUSE', 'CLOSED'],
];
for (const [id, title, category, region, source, status] of jobs) {
  await db.query(
    `INSERT INTO "Job" (id, "companyId", title, fingerprint, category, region, "applyUrl", "applySource", status, rule, "scamReasons", "postedAt", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod")
     VALUES ($1, 'e2e-co', $2, $1, $3::"JobCategory", $4::"JobRegion", $5, $6::"JobSourceKind", $7::"JobStatus", 'eligible:test', '{}', now(), 50000, 70000, 'USD', 'YEAR')`,
    [id, title, category, region, `https://example.com/jobs/${id}`, source, status],
  );
}
await db.query(
  `INSERT INTO "JobListing" (id, "jobId", source, "externalId", "sourceUrl") VALUES ('e2e-l1', 'e2e-job-1', 'REMOTEOK', 'e2e-1', 'https://remoteok.com/remote-jobs/e2e-1')`,
);
await db.query(
  `INSERT INTO "JobSeeker" (id, email, "marketingConsent", "consentAt") VALUES ('e2e-seeker', 'e2e.fan@jobs.test', true, now())`,
);
await db.end();

// A child process, so the compiled app loads exactly as in production (not through tsx).
const api = spawn(process.execPath, ['dist/src/main.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: url,
    NODE_ENV: 'test',
    BCRYPT_ROUNDS: '4',
    RATE_LIMIT_PER_MIN: '100000',
    AUTH_RATE_LIMIT_PER_MIN: '100000',
    MAIL_TRANSPORT: 'console',
    STRIPE_FAKE: 'true',
    STRIPE_WEBHOOK_SECRET: 'whsec_e2e_secret',
    CRON_ENABLED: 'false',
    UPLOAD_DIR: `${tmpdir()}/ai-academy-web-e2e-uploads`,
  },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => api.kill(signal));
}
api.on('exit', (code) => process.exit(code ?? 0));
