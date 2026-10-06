import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * Web end-to-end tests. Runs against a production build (`next start`); locally an
 * already-running server on :3000 is reused. Uses the system Chrome, so no browser download
 * is needed (GitHub's Ubuntu runners ship Chrome).
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
  webServer: {
    command: `pnpm start`,
    url: `${baseURL}/sq`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
