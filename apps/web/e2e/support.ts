import { createHmac } from 'node:crypto';
import type { AdminGroup, AuthResponse, CourseDetail, StaffTest } from '@ai-academy/shared';
import { type APIRequestContext, expect, type Page } from '@playwright/test';

/** Seeded accounts (apps/api/prisma/seed.ts); the e2e API runs on a freshly seeded database. */
export const PASSWORD = 'Password123!';
export const ADMIN = 'admin@aiacademy.dev';
export const INSTRUCTOR = 'instructor@aiacademy.dev';
export const STUDENT = 'student1@aiacademy.dev';
export const MEET = 'https://meet.google.com/abc-defg-hij';

/**
 * The API as the tests call it. On the default ports the same-origin rewrite proxies it; when
 * the ports are moved (E2E_API_PORT) the web server's rewrite still points at 4000, so the
 * tests talk to the API directly, like the browser does with NEXT_PUBLIC_API_URL.
 */
const API = process.env.E2E_API_PORT
  ? `http://localhost:${process.env.E2E_API_PORT}/api/v1`
  : '/api/v1';
/** Must match STRIPE_WEBHOOK_SECRET in apps/api/test/web-e2e-server.ts. */
const STRIPE_WEBHOOK_SECRET = 'whsec_e2e_secret';

/** A name that is unique across parallel workers and reruns. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Signs the page's browser context in through the API, which sets the refresh cookie;
 * the app restores the session from it on the next page load.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(res.ok(), `login as ${email}`).toBeTruthy();
}

/** A tiny authenticated JSON client for setting up data through the API. */
export async function apiAs(request: APIRequestContext, email: string) {
  const login = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(login.ok(), `login as ${email}`).toBeTruthy();
  const { accessToken, user } = (await login.json()) as AuthResponse;
  const headers = { Authorization: `Bearer ${accessToken}` };
  const call = async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const res = await request.fetch(`${API}${path}`, { method, headers, data });
    expect(res.ok(), `${method} ${path}: ${res.status()} ${await res.text()}`).toBeTruthy();
    return (res.status() === 204 ? undefined : await res.json()) as T;
  };
  return {
    user,
    get: <T>(path: string) => call<T>('GET', path),
    post: <T>(path: string, data?: unknown) => call<T>('POST', path, data),
    patch: <T>(path: string, data?: unknown) => call<T>('PATCH', path, data),
    put: <T>(path: string, data?: unknown) => call<T>('PUT', path, data),
  };
}

/** Registers a new student through the API and returns the email. */
export async function registerStudent(
  request: APIRequestContext,
  name = 'Student',
): Promise<string> {
  const email = `${unique(name.toLowerCase())}@example.com`;
  const res = await request.post(`${API}/auth/register`, {
    data: { email, password: PASSWORD, firstName: name, lastName: 'Tester' },
  });
  expect(res.ok(), `register ${email}`).toBeTruthy();
  return email;
}

/** A published two-module course taught by the seeded instructor, with one open group. */
export async function createCourse(
  request: APIRequestContext,
  capacity = 10,
): Promise<{ course: CourseDetail; group: AdminGroup }> {
  const admin = await apiAs(request, ADMIN);
  const instructor = await apiAs(request, INSTRUCTOR);
  const slug = unique('e2e-course');
  const created = await admin.post<CourseDetail>('/courses', {
    slug,
    title: `Kursi E2E ${slug.slice(-5)}`,
    summary: 'Një kurs i krijuar nga testet Playwright.',
    description: 'Dy module: regjistrimi, një leksion live dhe një test.',
    isPublished: true,
    priceCents: 8900,
    listPriceCents: 15000,
    currency: 'EUR',
  });
  for (const title of ['Fillimi', 'Vazhdimi']) {
    await admin.post(`/courses/${created.id}/modules`, {
      title,
      description: `${title}: një modul i krijuar nga testet Playwright.`,
      instructorId: instructor.user.id,
    });
  }
  const group = await admin.post<AdminGroup>(`/courses/${created.id}/groups`, {
    name: 'Grupi 1 – Nëntor 2026',
    startDate: '2026-11-01',
    weekdays: [1, 3, 5],
    startTime: '19:00',
    capacity,
    instructorId: instructor.user.id,
    meetUrl: MEET,
  });
  const course = await admin.get<CourseDetail>(`/courses/by-id/${created.id}`);
  return { course, group };
}

/**
 * Simulates Stripe: posts a signed `checkout.session.completed` for the payment. The e2e API
 * runs with a fake Stripe client and a known webhook secret, so the signature is real.
 */
export async function simulateStripeWebhook(
  request: APIRequestContext,
  paymentId: string,
): Promise<void> {
  const sessionId = await stripeSessionIdOf(request, paymentId);
  const event = {
    id: `evt_e2e_${unique('x')}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        client_reference_id: paymentId,
        payment_status: 'paid',
        payment_intent: `pi_${sessionId}`,
        metadata: { paymentId },
      },
    },
  };
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  const res = await request.post(`${API}/payments/stripe/webhook`, {
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
      'Content-Type': 'application/json',
    },
    data: payload,
  });
  expect(res.ok(), `webhook: ${res.status()} ${await res.text()}`).toBeTruthy();
}

/** The hosted session id of a card payment, from the admin endpoint made for this. */
async function stripeSessionIdOf(request: APIRequestContext, paymentId: string): Promise<string> {
  const admin = await apiAs(request, ADMIN);
  const { sessionId } = await admin.get<{ sessionId: string }>(
    `/payments/${paymentId}/stripe-session`,
  );
  return sessionId;
}

/** A published one-question test on a module, open from an hour ago for a day. */
export async function createOpenTest(request: APIRequestContext, moduleId: string) {
  const instructor = await apiAs(request, INSTRUCTOR);
  const hour = 60 * 60_000;
  const test = await instructor.post<StaffTest>(`/modules/${moduleId}/test`, {
    title: 'Fillimi: testi',
    opensAt: new Date(Date.now() - hour).toISOString(),
    closesAt: new Date(Date.now() + 24 * hour).toISOString(),
  });
  await instructor.put(`/tests/${test.id}/questions`, {
    questions: [
      {
        type: 'SINGLE_CHOICE',
        text: 'Ku zhvillohen leksionet live?',
        options: [
          { text: 'Në Google Meet', isCorrect: true },
          { text: 'Me postë', isCorrect: false },
        ],
      },
    ],
  });
  await instructor.patch(`/tests/${test.id}/publish`, { isPublished: true });
  return test;
}

/** `datetime-local` value for a time relative to now, in the browser's (= this machine's) zone. */
export function localInput(offsetMs: number): string {
  const d = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
