import type { AdminGroup, CourseDetail } from '@ai-academy/shared';
import { expect, test } from '@playwright/test';
import {
  ADMIN,
  apiAs,
  createCourse,
  createOpenTest,
  INSTRUCTOR,
  localInput,
  MEET,
  registerStudent,
  signIn,
  simulateStripeWebhook,
} from './support';

/**
 * The main journey, in Albanian: a visitor sees the course with the price and the seats,
 * registers, pays the first month by card (the Stripe webhook is simulated), gets the
 * confirmation email with the timetable (console transport) and sees the timetable, the
 * Join button and the offline lessons; then passes the test and pays month 2 to open it.
 */
test.describe('a student pays by card and learns', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ isMobile }) => isMobile, 'The journey runs once, on desktop.');

  let course: CourseDetail;
  let group: AdminGroup;
  let student: string;

  test.beforeAll(async ({ request }) => {
    ({ course, group } = await createCourse(request));
    student = await registerStudent(request, 'Petra');
    const instructor = await apiAs(request, INSTRUCTOR);
    await instructor.post(`/modules/${course.modules[0].id}/lessons`, {
      title: 'Mësimi i parë offline',
      content: '# Mirë se vini\n\nLexo këtë para leksionit të parë.',
      estimatedMin: 5,
    });
  });

  test('the course page shows the price, the discount, the schedule and real seats', async ({
    page,
  }) => {
    await page.goto(`/courses/${course.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.title);
    await expect(page.getByText('€89', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('€150').first()).toBeVisible();
    await expect(page.getByText('10 vende të lira')).toBeVisible();
    await expect(page.getByText('Hën, Mër, Pre · 19:00–21:00')).toBeVisible();
    await expect(page.getByText('Maksimumi 10 persona për grup')).toBeVisible();
    // Logged out: "Regjistrohu" sends the visitor through registration back to checkout.
    const register = page.getByRole('link', { name: 'Regjistrohu', exact: true }).last();
    await expect(register).toHaveAttribute('href', `/register?next=%2Fcheckout%2F${group.id}`);
  });

  test('the student picks the card and is sent to Stripe; the webhook confirms the seat', async ({
    page,
    request,
  }) => {
    await signIn(page, student);
    await page.goto(`/checkout/${group.id}`);
    await expect(page.getByRole('heading', { name: 'Pagesa e muajit të parë' })).toBeVisible();
    await expect(page.getByText('€89 në muaj')).toBeVisible();
    await page.getByRole('radio', { name: /Paguaj me kartë/ }).click();
    await page.getByRole('button', { name: 'Vazhdo te pagesa' }).click();
    // The fake Stripe client sends the browser straight to the success page, where the app
    // waits for the webhook (the redirect alone confirms nothing).
    await expect(page).toHaveURL(/\/checkout\/success\?payment=/);
    await expect(page.getByRole('heading', { name: /Po konfirmojmë pagesën/ })).toBeVisible();
    const paymentId = new URL(page.url()).searchParams.get('payment')!;
    const admin = await apiAs(request, ADMIN);
    const before = await admin.get<{ items: { id: string; status: string }[] }>(
      '/payments?pageSize=100',
    );
    expect(before.items.find((p) => p.id === paymentId)?.status).toBe('PENDING');

    await simulateStripeWebhook(request, paymentId);
    await expect(page.getByRole('heading', { name: 'Pagesa u konfirmua' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('link', { name: 'Hap kursin' }).click();
    await expect(page).toHaveURL(new RegExp(`/learn/${course.slug}$`));
    await expect(page.getByText('Aktiv', { exact: true })).toBeVisible();
    await expect(page.getByText('I mbyllur', { exact: true })).toBeVisible();
    await expect(page.getByText('I paguar', { exact: true })).toBeVisible();

    // The confirmation email went out through the console transport, with 12 lectures.
    const emails = await admin.get<{ items: { type: string; to: string; subject: string }[] }>(
      '/admin/emails?type=REGISTRATION_CONFIRMED&pageSize=100',
    );
    const mine = emails.items.find((e) => e.to === student);
    expect(mine?.subject).toBe(`Je regjistruar në ${course.title}`);
  });

  test('the module shows the timetable, the Join button and the offline lesson', async ({
    browser,
  }) => {
    // The instructor adds a lecture starting in 10 minutes (inside the join window).
    const instructorPage = await browser.newPage();
    await signIn(instructorPage, INSTRUCTOR);
    await instructorPage.goto(`/teach/modules/${course.modules[0].id}`);
    await instructorPage.getByRole('button', { name: 'Shto leksion' }).click();
    const dialog = instructorPage.getByRole('dialog');
    await dialog.getByLabel('Titulli').fill('Leksioni i hapjes');
    await dialog.getByLabel('Fillon më').fill(localInput(10 * 60_000));
    await dialog.getByLabel('Lidhja e Google Meet').fill(MEET);
    await dialog.getByRole('button', { name: 'Ruaj leksionin' }).click();
    await expect(dialog).toBeHidden();

    const page = await browser.newPage();
    await signIn(page, student);
    await page.goto(`/learn/${course.slug}/${course.modules[0].id}`);
    await expect(page.getByRole('heading', { name: 'Leksionet live' })).toBeVisible();
    // The generated timetable (12 lectures) plus the instructor's extra one.
    await expect(page.getByText('Leksioni 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Hyr në Google Meet/ }).first()).toHaveAttribute(
      'href',
      MEET,
    );
    await page.getByRole('link', { name: /Mësimi i parë offline/ }).click();
    await expect(page.getByRole('heading', { name: 'Mësimi i parë offline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mirë se vini' })).toBeVisible();
    await page.getByRole('button', { name: 'Shëno si të përfunduar' }).click();
    await expect(page.getByText('I përfunduar')).toBeVisible();
  });

  test('passing the test opens module 2 only once month 2 is paid', async ({
    browser,
    request,
  }) => {
    const test = await createOpenTest(request, course.modules[0].id);
    const page = await browser.newPage();
    await signIn(page, student);
    await page.goto(`/tests/${test.id}`);
    await page.getByRole('button', { name: 'Fillo testin' }).click();
    await page.getByLabel('Në Google Meet').check();
    await expect(page.getByText('U ruajt', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Dorëzo testin' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dorëzo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'E kalove!' })).toBeVisible();

    // Month 2 is unpaid: the course page offers to pay it; module 2 is still locked.
    await page.goto(`/learn/${course.slug}`);
    await expect(page.getByText('I kaluar', { exact: true })).toBeVisible();
    await expect(page.getByText('I mbyllur', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Paguaj modulin 2' }).click();
    await expect(page.getByRole('heading', { name: 'Pagesa e modulit 2' })).toBeVisible();
    await page.getByRole('radio', { name: /Paguaj me kartë/ }).click();
    await page.getByRole('button', { name: 'Vazhdo te pagesa' }).click();
    await expect(page).toHaveURL(/\/checkout\/success\?payment=/);
    const paymentId = new URL(page.url()).searchParams.get('payment')!;
    await simulateStripeWebhook(request, paymentId);
    await expect(page.getByRole('heading', { name: 'Pagesa u konfirmua' })).toBeVisible({
      timeout: 15_000,
    });
    await page.goto(`/learn/${course.slug}`);
    await expect(page.getByText('Aktiv', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Vazhdimi/ })).toBeVisible();
  });
});

/** A second student pays by bank transfer; the admin confirms it and the seat is taken. */
test.describe('a student pays by bank transfer', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ isMobile }) => isMobile, 'The journey runs once, on desktop.');

  let course: CourseDetail;
  let group: AdminGroup;
  let student: string;

  test.beforeAll(async ({ request }) => {
    ({ course, group } = await createCourse(request));
    student = await registerStudent(request, 'Besa');
  });

  test('the student gets the bank details and a reference', async ({ page }) => {
    await signIn(page, student);
    await page.goto(`/checkout/${group.id}`);
    await page.getByRole('radio', { name: /Transfertë bankare/ }).click();
    await page.getByRole('button', { name: 'Merr të dhënat e bankës' }).click();
    await expect(page).toHaveURL(/\/payments\//);
    await expect(
      page.getByRole('heading', { name: 'Të dhënat për transfertën bankare' }),
    ).toBeVisible();
    await expect(page.getByText('Në pritje', { exact: true })).toBeVisible();
    await expect(page.getByText(/^AV-[A-Z2-9]{8}$/).first()).toBeVisible();
    await expect(page.getByText(/Vendi yt mbahet deri më/)).toBeVisible();
  });

  test('the admin confirms the payment and the student is enrolled', async ({ page, request }) => {
    const admin = await apiAs(request, ADMIN);
    const list = await admin.get<{
      items: { id: string; user: { email: string }; status: string }[];
    }>('/payments?provider=BANK_TRANSFER&status=PENDING&pageSize=100');
    const payment = list.items.find((p) => p.user.email === student);
    expect(payment).toBeTruthy();

    await signIn(page, ADMIN);
    await page.goto('/admin/payments?provider=BANK_TRANSFER&status=PENDING');
    const row = page.getByRole('listitem').filter({ hasText: student });
    await row.getByRole('button', { name: 'Konfirmo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Konfirmo', exact: true }).click();
    await expect(page.getByText('Pagesa u konfirmua').first()).toBeVisible();

    const studentPage = await page.context().browser()!.newPage();
    await signIn(studentPage, student);
    await studentPage.goto(`/learn/${course.slug}`);
    await expect(studentPage.getByText('Aktiv', { exact: true })).toBeVisible();
    await expect(studentPage.getByText('I paguar', { exact: true })).toBeVisible();
    const seats = await admin.get<AdminGroup>(`/admin/groups/${group.id}`);
    expect(seats.seatsLeft).toBe(9);
  });
});
