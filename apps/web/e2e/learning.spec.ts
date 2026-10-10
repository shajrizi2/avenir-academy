import type { CourseDetail } from '@ai-academy/shared';
import { expect, test } from '@playwright/test';
import {
  ADMIN,
  createCourse,
  createOpenTest,
  INSTRUCTOR,
  localInput,
  registerStudent,
  signIn,
} from './support';

/**
 * The main journey: enroll → admin approval → the instructor schedules a class and shares a
 * link → the student joins, passes the module test and unlocks module 2.
 */
test.describe('a student’s path through a course', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ isMobile }) => isMobile, 'The journey runs once, on desktop.');

  let course: CourseDetail;
  let student: string;

  test.beforeAll(async ({ request }) => {
    course = await createCourse(request);
    student = await registerStudent(request, 'Petra');
  });

  test('the student requests a place and the admin approves it', async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, student);
    await page.goto(`/courses/${course.slug}`);
    await page.getByRole('button', { name: 'Enroll' }).click();
    await expect(page.getByText('Your request is waiting for admin approval.')).toBeVisible();

    const admin = await browser.newPage();
    await signIn(admin, ADMIN);
    await admin.goto('/admin/enrollments');
    const row = admin.getByRole('listitem').filter({ hasText: student });
    await row.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(admin.getByText(/approved/i).first()).toBeVisible();

    await page.goto(`/learn/${course.slug}`);
    await expect(page.getByRole('link', { name: /Getting started/ })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByText('Locked', { exact: true })).toBeVisible();
  });

  test('the instructor schedules a class and shares a link', async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, INSTRUCTOR);
    await page.goto(`/teach/modules/${course.modules[0].id}`);

    await page.getByRole('button', { name: 'Add session' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Kick-off class');
    // Ten minutes from now: inside the 15-minute join window.
    await dialog.getByLabel('Starts at').fill(localInput(10 * 60_000));
    await dialog.getByLabel('Google Meet link').fill('https://meet.google.com/abc-defg-hij');
    await dialog.getByRole('button', { name: 'Save session' }).click();
    await expect(page.getByText('Session scheduled')).toBeVisible();
    await expect(dialog).toBeHidden();

    const linkForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Add link' }) });
    await linkForm.getByLabel('Title').fill('Course handbook');
    await linkForm.getByLabel('Link').fill('https://example.com/handbook');
    await linkForm.getByRole('button', { name: 'Add link' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Course handbook' })).toBeVisible();
  });

  test('the student joins the class, passes the test and unlocks module 2', async ({
    browser,
    request,
  }) => {
    const test = await createOpenTest(request, course.modules[0].id);
    const page = await browser.newPage();
    await signIn(page, student);

    await page.goto('/dashboard');
    await expect(page.getByText('0 of 2 modules passed')).toBeVisible();

    await page.goto(`/learn/${course.slug}/${course.modules[0].id}`);
    await expect(page.getByRole('link', { name: /Join on Google Meet/ })).toHaveAttribute(
      'href',
      'https://meet.google.com/abc-defg-hij',
    );
    await expect(page.getByRole('link', { name: /Course handbook/ })).toBeVisible();

    await page.getByRole('link', { name: 'Take the test' }).click();
    await expect(page).toHaveURL(new RegExp(`/tests/${test.id}$`));
    await page.getByRole('button', { name: 'Start the test' }).click();
    await page.getByLabel('On Google Meet').check();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hand in the test' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hand in' }).click();

    await expect(page.getByRole('heading', { name: 'You passed!' })).toBeVisible();
    await page.getByRole('link', { name: /Module 2 is open/ }).click();
    await expect(page).toHaveURL(new RegExp(course.modules[1].id));
    await expect(page.getByRole('heading', { name: 'Going further' })).toBeVisible();

    const instructor = await browser.newPage();
    await signIn(instructor, INSTRUCTOR);
    await instructor.goto(`/teach/modules/${course.modules[0].id}/results`);
    await expect(instructor.getByRole('listitem').filter({ hasText: student })).toContainText(
      'Passed',
    );
  });
});
