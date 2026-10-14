import { expect, test } from '@playwright/test';
import { PASSWORD, STUDENT, unique } from './support';

test('a visitor creates an account and lands on the dashboard', async ({ page }) => {
  const email = `${unique('visitor')}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Emri', { exact: true }).fill('Vera');
  await page.getByLabel('Mbiemri').fill('Visitor');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Fjalëkalimi', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Konfirmo fjalëkalimin').fill(PASSWORD);
  await page.getByRole('button', { name: 'Krijo llogarinë' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Mirë se erdhe, Vera' })).toBeVisible();
});

test('a wrong password shows an Albanian error and keeps the visitor on the login page', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(STUDENT);
  await page.getByLabel('Fjalëkalimi').fill('not-the-password');
  await page.getByRole('button', { name: 'Hyr', exact: true }).click();
  await expect(page.getByText('Email-i ose fjalëkalimi është i gabuar')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  // Credentials never end up in the URL.
  expect(page.url()).not.toContain('password');
});

test('signed-out visitors are sent to login, then back to where they were going', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await page.getByLabel('Email').fill(STUDENT);
  await page.getByLabel('Fjalëkalimi').fill(PASSWORD);
  await page.getByRole('button', { name: 'Hyr', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Mirë se erdhe, Sara' })).toBeVisible();
});
