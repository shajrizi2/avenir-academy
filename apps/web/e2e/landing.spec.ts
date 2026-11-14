import { expect, test } from '@playwright/test';
import sq from '../messages/sq.json' with { type: 'json' };

const t = sq.landing;

test.describe('landing /training', () => {
  test('shows the Albanian headline and metadata', async ({ page }) => {
    await page.goto('/training');
    await expect(page.locator('html')).toHaveAttribute('lang', 'sq');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t.hero.title);
    await expect(page).toHaveTitle(t.meta.title);
  });

  test('the hero CTAs go to /register and to the courses', async ({ page }) => {
    await page.goto('/training');
    const hero = page.getByRole('region', { name: t.hero.title });
    await hero.getByRole('link', { name: t.hero.ctaSecondary }).click();
    await expect(page).toHaveURL(/#tracks$/);
    await expect(page.getByRole('heading', { name: t.tracks.title })).toBeInViewport();
    await hero.getByRole('link', { name: t.hero.ctaPrimary }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText(sq.auth.register.title)).toBeVisible();
  });

  test('sells the three courses with the price, the discount and real seats', async ({ page }) => {
    await page.goto('/training');
    const tracks = page.locator('#tracks');
    for (const title of [
      'Development & Vibe Coding përmes AI',
      'Digital Marketing & AI',
      'SEO përmes AI',
    ]) {
      await expect(tracks.getByRole('heading', { name: title })).toBeVisible();
    }
    // Other suites publish their own courses in parallel, so look at the seeded ones only.
    const vibe = tracks.getByRole('article').filter({ hasText: 'Development & Vibe Coding' });
    const seo = tracks.getByRole('article').filter({ hasText: 'SEO përmes AI' });
    await expect(vibe.getByText('€89', { exact: true })).toBeVisible();
    await expect(vibe.getByText('€150')).toBeVisible();
    await expect(vibe.getByText('-41%')).toBeVisible();
    // The seed enrols one student in Vibe Coding (9 seats left) and nobody in SEO.
    await expect(vibe.getByText('9 vende të lira')).toBeVisible();
    await expect(seo.getByText('10 vende të lira')).toBeVisible();
    await expect(vibe.getByText(/1 nëntor 2026/)).toBeVisible();
    await expect(page.getByText('Maksimumi 10 persona për grup').first()).toBeVisible();
  });

  test('the header "Fillo tani" button goes to /register', async ({ page }) => {
    await page.goto('/training');
    await page.getByRole('banner').getByRole('link', { name: t.nav.cta }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('the hero demo gives instant feedback on an answer', async ({ page }) => {
    await page.goto('/training');
    const { demo } = t.hero;
    const topic = demo.topics[1];
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
    await expect(feedback.getByRole('link', { name: demo.cta })).toHaveAttribute(
      'href',
      '/training/register',
    );
  });

  test('has SEO essentials and no English alternates', async ({ page }) => {
    await page.goto('/training');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/training$/);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      /opengraph-image/,
    );
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
  });
});

test('old landing addresses redirect permanently to /training', async ({ request }) => {
  for (const [from, to] of [
    ['/sq', '/training'],
    ['/en', '/training'],
    ['/en/kurse?x=1', '/training?x=1'],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(308);
    const location = new URL(res.headers().location ?? '', 'http://localhost');
    expect(location.pathname + location.search).toBe(to);
  }
});

test('unknown locales are a 404', async ({ page }) => {
  const res = await page.goto('/de');
  expect(res?.status()).toBe(404);
});

test('phones get a sticky "Regjistrohu tani" bar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/training');
  await page.mouse.wheel(0, 2500);
  const bar = page.getByRole('link', { name: t.mobileBar.cta }).last();
  await expect(bar).toBeInViewport();
  await expect(bar).toHaveAttribute('href', '/training/register');
});
