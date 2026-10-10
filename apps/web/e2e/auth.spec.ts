import { expect, test } from '@playwright/test';
import { PASSWORD, STUDENT, unique } from './support';

test('a visitor creates an account and lands on the dashboard', async ({ page }) => {
  const email = `${unique('visitor')}@example.com`;
  await page.goto('/register');
  await page.getByLabel('First name').fill('Vera');
  await page.getByLabel('Last name').fill('Visitor');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome, Vera' })).toBeVisible();
});

test('a wrong password shows an error and keeps the visitor on the login page', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(STUDENT);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Invalid email or password')).toBeVisible();
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
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome, Sara' })).toBeVisible();
});
