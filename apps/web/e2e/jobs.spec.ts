import { expect, test } from '@playwright/test';
import sq from '../messages/sq.json' with { type: 'json' };
import { ADMIN, signIn } from './support';

const j = sq.jobs;

/** The job board (PLAN D36). It is switched off in the test database, so `?preview` shows it. */
test.describe('job board', () => {
  test('lists open jobs with a few details, tags and the source credit', async ({ page }) => {
    await page.goto('/?preview');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(j.title);
    const list = page.getByRole('list', { name: j.listLabel });
    await expect(list.getByRole('heading', { name: 'Growth Marketer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Old Role' })).toHaveCount(0);
    await expect(list.getByText('$50k–$70k në vit').first()).toBeVisible();
    await expect(list.getByRole('link', { name: 'Burimi: Remote OK' })).toHaveAttribute(
      'href',
      'https://remoteok.com/remote-jobs/e2e-1',
    );
    const apply = list.getByRole('link', { name: /Apliko për Growth Marketer/ });
    await expect(apply).toHaveAttribute('href', 'https://example.com/jobs/e2e-job-1');
    await expect(apply).toHaveAttribute('target', '_blank');
    await expect(page.getByText(j.warning)).toBeVisible();
  });

  test('filters by category', async ({ page }) => {
    await page.goto('/?preview&kategoria=inxhinieri');
    const nav = page.getByRole('navigation', { name: j.categoriesLabel });
    await expect(
      nav.getByRole('link', { name: new RegExp(j.categories.ENGINEERING) }),
    ).toHaveAttribute('aria-current', 'page');
    const list = page.getByRole('list', { name: j.listLabel });
    await expect(list.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Growth Marketer' })).toHaveCount(0);
  });

  test('saving while signed out leads to the email sign-in, which sends a code', async ({
    page,
  }) => {
    await page.goto('/?preview');
    await page.getByRole('button', { name: 'Ruaj Growth Marketer' }).click();
    await expect(page).toHaveURL(/\/hyr\?next=%2F%3Fpreview$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(j.login.title);

    const email = page.getByLabel(j.login.email);
    await email.fill(`saver.${Date.now()}@gmial.com`);
    const fix = page.getByRole('button', { name: /Përdor .*@gmail\.com/ });
    await fix.click();
    await expect(email).toHaveValue(/@gmail\.com$/);
    await page.getByRole('button', { name: j.login.send }).click();
    await expect(page.getByText(/Kodin e dërguam te .*@gmail\.com/)).toBeVisible();
    await expect(page.getByLabel(j.login.code)).toBeVisible();
  });

  test('the header offers sign-in on the board and the academy keeps its own', async ({ page }) => {
    await page.goto('/?preview');
    await expect(page.getByRole('banner').getByRole('link', { name: j.signIn })).toHaveAttribute(
      'href',
      '/hyr',
    );
    await page.goto('/training/courses');
    await expect(
      page.getByRole('banner').getByRole('link', { name: sq.nav.login }),
    ).toHaveAttribute('href', '/training/login');
  });
});

test('admins add a company by its careers link and can switch the board on', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto('/training/admin/jobs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sq.adminJobs.title);
  await page.getByLabel(sq.adminJobs.companyName).fill('Widget Works');
  await page
    .getByLabel(sq.adminJobs.careersUrl)
    .fill(`https://jobs.lever.co/widget-works-${Date.now()}`);
  await page.getByRole('button', { name: sq.adminJobs.addCompany }).click();
  await expect(page.getByText('Widget Works').first()).toBeVisible();

  await page.goto('/training/admin/settings');
  await expect(page.getByLabel(sq.adminLaunch.settings.jobBoardPublic)).toBeVisible();
});
