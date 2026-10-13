import { defineConfig, devices } from '@playwright/test';

/** Ports can be moved (E2E_WEB_PORT, E2E_API_PORT) when a dev server already uses 3000/4000. */
const PORT = Number(process.env.E2E_WEB_PORT) || 3000;
const API_PORT = Number(process.env.E2E_API_PORT) || 4000;
const baseURL = `http://localhost:${PORT}`;

/**
 * Web end-to-end tests against production builds of the web app (`next start`) and the API.
 * The API runs on its own seeded database, `ai_academy_e2e` (apps/api/test/web-e2e-server.ts),
 * and is never reused: a dev API already on :4000 makes the run fail instead of writing test
 * data into the dev database. Run `pnpm build` first. Uses the system Chrome.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ai-academy/api test:e2e:serve',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      env: { PORT: String(API_PORT), WEB_URL: baseURL, CORS_ORIGINS: baseURL },
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
    },
    {
      command: `pnpm exec next start --port ${PORT}`,
      url: `${baseURL}/sq`,
      // The browser reaches the API directly (NEXT_PUBLIC_API_URL baked at build time, as in
      // production); the server reaches it through API_INTERNAL_URL. Build with
      // NEXT_PUBLIC_API_URL=http://localhost:<api port>/api/v1 when the ports are moved.
      env: { API_INTERNAL_URL: `http://localhost:${API_PORT}/api/v1` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
