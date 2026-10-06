import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import sq from '../messages/sq.json' with { type: 'json' };

const locales = [
  { locale: 'sq', t: sq.landing },
  { locale: 'en', t: en.landing },
] as const;

for (const { locale, t } of locales) {
  test.describe(`landing /${locale}`, () => {
    test('shows the hero headline in the right language', async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(t.hero.title);
      await expect(page).toHaveTitle(t.meta.title);
    });

    test('"Register now" goes to /register', async ({ page }) => {
      await page.goto(`/${locale}`);
      const hero = page.getByRole('region', { name: t.hero.title });
      await hero.getByRole('link', { name: t.hero.ctaPrimary }).click();
      await expect(page).toHaveURL(/\/register$/);
      await expect(page.getByText('Create your account')).toBeVisible();
    });

    test('has SEO essentials', async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/${locale}$`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="sq"]')).toHaveCount(1);
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
        'content',
        /opengraph-image/,
      );
      expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    });
  });
}

test('"/" redirects to the Albanian landing page by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/sq$/);
});

test('the language switch moves to English and is remembered', async ({ page, isMobile }) => {
  await page.goto('/sq');
  if (isMobile) await page.getByRole('button', { name: sq.landing.nav.openMenu }).click();
  await page
    .getByRole('link', { name: new RegExp(sq.landing.nav.switchTo) })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
});

test('unknown locales are a 404', async ({ page }) => {
  const res = await page.goto('/de');
  expect(res?.status()).toBe(404);
});

test('phones get a sticky "Register now" bar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/sq');
  await page.mouse.wheel(0, 2500);
  const bar = page.getByRole('link', { name: sq.landing.mobileBar.cta }).last();
  await expect(bar).toBeInViewport();
  await expect(bar).toHaveAttribute('href', '/register');
});
