/**
 * Starts the built API for the web (Playwright) e2e suite: a fresh, seeded `ai_academy_e2e`
 * database, relaxed rate limits and a throwaway upload folder. Playwright runs this as a web
 * server (apps/web/playwright.config.ts), passing PORT and WEB_URL; run `pnpm build` first.
 */
import { execSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { prepareDatabase, webE2eDatabaseUrl } from './test-database.js';

const url = webE2eDatabaseUrl();
await prepareDatabase(url);
execSync('pnpm exec prisma db seed', {
  env: { ...process.env, DATABASE_URL: url },
  stdio: 'inherit',
});

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
