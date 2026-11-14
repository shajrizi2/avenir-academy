import { expect, test } from '@playwright/test';

/** Old academy addresses (in emails already sent, Stripe and Google) still land on the right page. */
test.describe('old addresses move to /training', () => {
  const cases: [string, RegExp][] = [
    ['/', /\/training$/],
    ['/sq', /\/training$/],
    ['/en', /\/training$/],
    ['/courses', /\/training\/courses$/],
    ['/courses/vibe-coding-ai', /\/training\/courses\/vibe-coding-ai$/],
    ['/login', /\/training\/login$/],
    ['/register?next=%2Fdashboard', /\/training\/register\?next=%2Fdashboard$/],
    ['/forgot-password', /\/training\/forgot-password$/],
  ];
  for (const [from, to] of cases) {
    test(`${from} lands on its /training page`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    });
  }

  test('a signed-out deep link into the academy goes to its login, then back', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/training\/login\?next=%2Ftraining%2Fdashboard$/);
  });
});
