import { expect, test } from '@playwright/test';
import sq from '../messages/sq.json' with { type: 'json' };

const s = sq.shell;

test('the main menu links the job board and the academy, and marks where you are', async ({
  page,
}) => {
  await page.goto('/training/courses');
  const menu = page.getByRole('navigation', { name: s.mainMenu }).filter({ visible: true });
  await expect(menu.getByRole('link', { name: s.training })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(menu.getByRole('link', { name: s.jobs })).toHaveAttribute('href', '/');
});

test('the footer leads to the English page for companies and to the privacy notice', async ({
  page,
}) => {
  await page.goto('/training/courses');
  const footer = page.getByRole('navigation', { name: s.footerLinks });
  await footer.getByRole('link', { name: s.forCompanies }).click();
  await expect(page).toHaveURL(/\/for-companies$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sq.forCompanies.title);
  await expect(page.locator('section[lang="en"]')).toBeVisible();
  await page
    .getByRole('navigation', { name: s.footerLinks })
    .getByRole('link', { name: s.privacy })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sq.privacy.title);
});

test('/sourcing is an empty page kept out of search engines', async ({ page }) => {
  await page.goto('/sourcing');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
