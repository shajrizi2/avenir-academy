import { expect, test } from '@playwright/test';
import sq from '../messages/sq.json' with { type: 'json' };
import { ADMIN, signIn } from './support';

const j = sq.jobs;

/** The job board (PLAN D36, D37). It is switched off in the test database, so `?preview` shows it. */
test.describe('job board', () => {
  test('lists open jobs with a few details, tags, the source credit and only "Apliko"', async ({
    page,
  }) => {
    await page.goto('/?preview');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(j.title);
    const list = page.getByRole('list', { name: j.listLabel });
    await expect(list.getByRole('heading', { name: 'Growth Marketer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Old Role' })).toHaveCount(0);
    await expect(list.getByText('$50k–$70k në vit').first()).toBeVisible();
    await expect(
      list.getByText('Growth Marketer: plan and run the work with a small remote team.'),
    ).toBeVisible();
    // The title opens the job too, and the rows alternate white and grey.
    const title = list.getByRole('link', { name: /^Growth Marketer te E2E Labs/ });
    await expect(title).toHaveAttribute('href', 'https://example.com/jobs/e2e-job-1');
    await expect(title).toHaveAttribute('target', '_blank');
    const apply = list.getByRole('link', { name: /Apliko për Growth Marketer/ });
    await expect(apply).toHaveAttribute('href', 'https://example.com/jobs/e2e-job-1');
    const rows = list.getByRole('listitem');
    const background = (i: number) =>
      rows.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await background(0)).not.toBe(await background(1));
    await expect(list.getByText(/Burimi/)).toHaveCount(0);
    await expect(list.getByRole('button')).toHaveCount(0);
    // One credit line for the job boards under the list, as their terms ask.
    await expect(page.getByRole('link', { name: 'Himalayas', exact: true })).toHaveAttribute(
      'href',
      'https://himalayas.app',
    );
  });

  test('searches with the bar and narrows with the job-type dropdown', async ({ page }) => {
    await page.goto('/?preview');
    const search = page.getByRole('search', { name: j.search.label });
    await search.getByRole('searchbox', { name: j.search.label }).fill('backend');
    await search.getByRole('button', { name: j.search.submit }).click();
    await expect(page).toHaveURL(/q=backend/);
    const list = page.getByRole('list', { name: j.listLabel });
    await expect(list.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Growth Marketer' })).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('1 shpallje për “backend”');

    await page.goto('/?preview');
    await page
      .getByRole('combobox', { name: j.search.type })
      .selectOption({ label: `${j.categories.MARKETING} (1)` });
    await expect(page).toHaveURL(/kategoria=marketing/);
    await expect(list.getByRole('heading', { name: 'Growth Marketer' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Backend Engineer' })).toHaveCount(0);
  });

  test('after 10 seconds a signed-out visitor must sign in, with the email tick on', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/?preview');
    const dialog = page.getByRole('dialog', { name: j.login.title });
    await expect(dialog).toHaveCount(0);
    // The timer starts once the page has hydrated and asked who is signed in.
    await page.waitForLoadState('networkidle');
    await page.clock.runFor(10_500);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: j.login.consent })).toBeChecked();

    const email = dialog.getByLabel(j.login.email);
    await email.fill(`gate.${Date.now()}@gmial.com`);
    await dialog.getByRole('button', { name: /Përdor .*@gmail\.com/ }).click();
    await expect(email).toHaveValue(/@gmail\.com$/);
    await dialog.getByRole('button', { name: j.login.send }).click();
    await expect(dialog.getByText(/Kodin e dërguam te .*@gmail\.com/)).toBeVisible();
    await expect(dialog.getByLabel(j.login.code)).toBeVisible();
  });

  test('the board has no sign-in or sign-out in its header', async ({ page }) => {
    await page.goto('/?preview');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Hyr' })).toHaveCount(0);
    await expect(page.getByRole('banner').getByRole('button', { name: /hyr|dil/i })).toHaveCount(0);
  });

  test('the unsubscribe page asks before unsubscribing and explains a broken link', async ({
    page,
  }) => {
    await page.goto('/cregjistrohu');
    await expect(page.getByText(sq.unsubscribe.invalid)).toBeVisible();
    await page.goto('/cregjistrohu?id=nobody&t=forged');
    await page.getByRole('button', { name: sq.unsubscribe.button }).click();
    await expect(page.getByText('Lidhja nuk është e vlefshme.')).toBeVisible();
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

test('admins see the stored emails and draft a campaign', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto('/training/admin/subscribers');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sq.adminSubscribers.title);
  await expect(page.getByText('e2e.fan@jobs.test')).toBeVisible();

  await page.goto('/training/admin/campaigns');
  const subject = `Punë të reja ${Date.now()}`;
  await page.getByLabel(sq.adminCampaigns.subject).fill(subject);
  await page.getByLabel(sq.adminCampaigns.body).fill('Paragrafi i parë.\n\nParagrafi i dytë.');
  await page.getByRole('button', { name: sq.adminCampaigns.save }).click();
  const card = page.getByRole('listitem').filter({ hasText: subject });
  await expect(card.getByText(sq.adminCampaigns.status.DRAFT, { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: sq.adminCampaigns.send })).toBeVisible();
});
