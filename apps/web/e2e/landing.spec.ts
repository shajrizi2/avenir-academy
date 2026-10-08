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

    test('the hero CTAs go to /register and to the tracks', async ({ page }) => {
      await page.goto(`/${locale}`);
      const hero = page.getByRole('region', { name: t.hero.title });
      await hero.getByRole('link', { name: t.hero.ctaSecondary }).click();
      await expect(page).toHaveURL(/#tracks$/);
      await expect(page.getByRole('heading', { name: t.tracks.title })).toBeInViewport();
      await hero.getByRole('link', { name: t.hero.ctaPrimary }).click();
      await expect(page).toHaveURL(/\/register$/);
      await expect(page.getByText('Create your account')).toBeVisible();
    });

    test('the header "Start now" button goes to /register', async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.getByRole('banner').getByRole('link', { name: t.nav.cta }).click();
      await expect(page).toHaveURL(/\/register$/);
    });

    test('the hero demo gives instant feedback on an answer', async ({ page }) => {
      await page.goto(`/${locale}`);
      const { demo } = t.hero;
      const topic = demo.topics[2];
      await page.getByRole('tab', { name: topic.tab }).click();
      await expect(page.getByRole('tab', { name: topic.tab })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      const panel = page.getByRole('tabpanel');
      await expect(panel.getByRole('heading', { name: topic.question })).toBeVisible();

      const wrong = topic.options.findIndex((_, i) => i !== topic.answer);
      await panel.getByRole('button', { name: topic.options[wrong] }).click();
      await expect(panel.getByTestId('demo-feedback')).toContainText(demo.incorrect);

      await panel.getByRole('button', { name: topic.options[topic.answer] }).click();
      const feedback = panel.getByTestId('demo-feedback');
      await expect(feedback).toContainText(demo.correct);
      await expect(feedback).toContainText(topic.explanation);
      await expect(feedback.getByRole('link', { name: demo.cta })).toHaveAttribute(
        'href',
        '/register',
      );
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
