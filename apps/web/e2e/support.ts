import type { AuthResponse, CourseDetail, StaffTest } from '@ai-academy/shared';
import { type APIRequestContext, expect, type Page } from '@playwright/test';

/** Seeded accounts (apps/api/prisma/seed.ts); the e2e API runs on a freshly seeded database. */
export const PASSWORD = 'Password123!';
export const ADMIN = 'admin@aiacademy.dev';
export const INSTRUCTOR = 'instructor@aiacademy.dev';
export const STUDENT = 'student1@aiacademy.dev';

const API = '/api/v1';

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

/** A published two-module course taught by the seeded instructor. */
export async function createCourse(request: APIRequestContext): Promise<CourseDetail> {
  const admin = await apiAs(request, ADMIN);
  const instructor = await apiAs(request, INSTRUCTOR);
  const slug = unique('e2e-course');
  const course = await admin.post<CourseDetail>('/courses', {
    slug,
    title: `E2E course ${slug.slice(-5)}`,
    summary: 'A course created by the Playwright suite.',
    description: 'Two modules: enrollment, a live session and a test.',
    isPublished: true,
  });
  for (const title of ['Getting started', 'Going further']) {
    await admin.post(`/courses/${course.id}/modules`, {
      title,
      description: `${title}: a module created by the Playwright suite.`,
      instructorId: instructor.user.id,
    });
  }
  return admin.get<CourseDetail>(`/courses/by-id/${course.id}`);
}

/** Approves a student's pending request for a course. */
export async function approve(request: APIRequestContext, courseId: string, email: string) {
  const admin = await apiAs(request, ADMIN);
  const queue = await admin.get<{ items: { id: string; user: { email: string } }[] }>(
    `/enrollments?status=PENDING&courseId=${courseId}&pageSize=100`,
  );
  const enrollment = queue.items.find((e) => e.user.email === email);
  expect(enrollment, `pending request for ${email}`).toBeTruthy();
  await admin.patch(`/enrollments/${enrollment?.id}`, { status: 'APPROVED' });
}

/** A published one-question test on a module, open from an hour ago for a day. */
export async function createOpenTest(request: APIRequestContext, moduleId: string) {
  const instructor = await apiAs(request, INSTRUCTOR);
  const hour = 60 * 60_000;
  const test = await instructor.post<StaffTest>(`/modules/${moduleId}/test`, {
    title: 'Getting started: test',
    opensAt: new Date(Date.now() - hour).toISOString(),
    closesAt: new Date(Date.now() + 24 * hour).toISOString(),
  });
  await instructor.put(`/tests/${test.id}/questions`, {
    questions: [
      {
        type: 'SINGLE_CHOICE',
        text: 'Where do the live classes happen?',
        options: [
          { text: 'On Google Meet', isCorrect: true },
          { text: 'By post', isCorrect: false },
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
