import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
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
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
    },
    {
      command: `pnpm start`,
      url: `${baseURL}/sq`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
