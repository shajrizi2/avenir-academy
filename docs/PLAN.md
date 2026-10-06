# AI Academy: Product & Delivery Plan

AI Academy is a simple LMS for live, cohort-based courses on AI and digital marketing.

## 1. Product (MVP)

Tracks cover AI (basics → AI integration → AI coding → AI in your profession) and digital marketing.

- Classes happen **live on Google Meet**. The platform only stores the Meet link for each session.
- Students register on the site and request enrollment in a course. An admin approves the request, which unlocks **Module 1**.
- Each module lasts about **one month** and ends with an **online test**. Passing the test unlocks the next module.

### Tracks (seed data)

| Course            | Module 1               | Module 2           | Module 3          | Module 4              |
| ----------------- | ---------------------- | ------------------ | ----------------- | --------------------- |
| AI Foundations    | AI Basics              | AI Integration     | AI Coding         | AI in Your Profession |
| Digital Marketing | Marketing Fundamentals | Social and Content | Ads and Analytics | AI for Marketing      |

### Roles

- **STUDENT** registers, requests enrollment, attends sessions, takes tests.
- **INSTRUCTOR** manages only the modules assigned to them (sessions, attendance, materials, tests, results).
- **ADMIN** can do everything.

### Out of scope

Online payments (an admin approves enrollment manually), certificates, video hosting, the Google Calendar API, chat, and i18n (English only for now).

## 2. Business rules

### Enrollment & progression

1. A student requests enrollment in a course, which creates an `Enrollment` with status `PENDING`. There is at most one per user and course.
2. When an admin approves it, the server creates one `ModuleProgress` row per module. Module 1 (`order = 1`) becomes `ACTIVE` and all other modules become `LOCKED`.
3. A student can open a module only if they are enrolled (`APPROVED`) and the module is not `LOCKED`.

### Tests

- Defaults, editable per test: **pass mark 70%**, **45-minute** time limit, **2 attempts**. The test window opens in the **last week of the module**.
- Question types: `SINGLE_CHOICE`, `MULTI_CHOICE`, `TRUE_FALSE`.
- **Grading happens only on the server.** Correct answers (`Option.isCorrect`) are never sent to students, neither when an attempt starts nor while it is in progress.
- A passed attempt sets the module to `PASSED` and the next module (`order + 1`) to `ACTIVE` in **one Prisma transaction**.
- With no attempts left, the module stays `FAILED` until an admin resets attempts or unlocks it manually (`PATCH /progress/:id`).
- An attempt that runs past its time limit becomes `EXPIRED`, and the server grades whatever answers were saved.

### Time

All times are stored in UTC and displayed in the viewer's local time.

## 3. Tech stack

| Area      | Choice                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo, TypeScript everywhere, ESLint + Prettier                                |
| Web       | Next.js (App Router), Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form + zod                 |
| API       | NestJS, Prisma ORM, PostgreSQL, Passport JWT (access + refresh tokens), bcrypt, class-validator DTOs |
| API paths | Global prefix `/api/v1`, Swagger at `/api/docs`                                                      |
| Shared    | `packages/shared`: zod schemas, enums, and API types used by both web and api                        |
| Local dev | `docker-compose.yml` with PostgreSQL 16, plus a `.env.example` in each app                           |
| Tests     | **Vitest** for API unit and e2e tests (see decision D1), Playwright for web (from Sprint 4)          |
| CI        | GitHub Actions: install, lint, type-check, test                                                      |

## 4. Data model

`apps/api/prisma/schema.prisma` is the source of truth. Entities:

- `User`: email (unique), passwordHash, firstName, lastName, phone?, role (`STUDENT` | `INSTRUCTOR` | `ADMIN`)
- `Course`: slug (unique), title, summary, description, coverUrl?, startDate?, isPublished
- `Module`: course, order (unique per course), title, description, durationWeeks (4), instructor?
- `Enrollment`: user + course (unique), status (`PENDING` | `APPROVED` | `REJECTED` | `CANCELLED`), note?, decidedAt?
- `ModuleProgress`: user + module (unique), status (`LOCKED` | `ACTIVE` | `PASSED` | `FAILED`), unlockedAt?, passedAt?
- `LiveSession`: module, title, startsAt, durationMin (90), meetUrl
- `Attendance`: session + user (composite id), present
- `Material`: module, title, url, kind
- `Test`: module (1:1), title, passMark (70), timeLimitMin (45), maxAttempts (2), opensAt, closesAt, isPublished
- `Question`: test, order, type, text, points (1)
- `Option`: question, text, isCorrect
- `TestAttempt`: test, user, status (`IN_PROGRESS` | `SUBMITTED` | `EXPIRED`), startedAt, submittedAt?, scorePct?, passed?, answers (JSON)

Changes to the data model need the product owner's approval first.

## 5. API (REST, `/api/v1`, `JwtAuthGuard` + `RolesGuard`)

| Area        | Endpoints                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth        | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`                                                                                                                                                          |
| users       | `GET/PATCH /users/me`; `GET /users`, `PATCH /users/:id/role` (admin)                                                                                                                                                                                                            |
| courses     | `GET /courses`, `GET /courses/:slug` (public); `POST/PATCH/DELETE` (admin)                                                                                                                                                                                                      |
| modules     | `POST /courses/:id/modules`, `PATCH /modules/:id` (admin); `GET /modules/:id` (enrolled + unlocked)                                                                                                                                                                             |
| enrollments | `POST /courses/:id/enroll` (student); `GET /enrollments?status=PENDING`, `PATCH /enrollments/:id` approve/reject (admin; approving creates the ModuleProgress rows)                                                                                                             |
| sessions    | `POST /modules/:id/sessions`, `PATCH /sessions/:id`, `PUT /sessions/:id/attendance` (instructor/admin); `GET /me/sessions/upcoming` (student)                                                                                                                                   |
| materials   | `POST /modules/:id/materials` (multipart or link), `DELETE /materials/:id`                                                                                                                                                                                                      |
| tests       | `POST /modules/:id/test`, `PUT /tests/:id/questions`, `PATCH /tests/:id/publish`; `POST /tests/:id/attempts` (student, response contains no answers); `PATCH /attempts/:id`; `POST /attempts/:id/submit`; `GET /tests/:id/results`; `PATCH /progress/:id` (manual unlock/reset) |
| progress    | `GET /me/progress`                                                                                                                                                                                                                                                              |

## 6. Pages (Next.js)

- **Public:** `/`, `/courses`, `/courses/[slug]`, `/register`, `/login`, `/forgot-password` (+ `/reset-password`)
- **Student:** `/dashboard`, `/learn/[courseSlug]`, `/learn/[courseSlug]/[moduleId]` (sessions with a "Join on Google Meet" button that becomes active 15 minutes before the start, materials, a test card), `/tests/[testId]`, `/tests/[testId]/result`, `/profile`
- **Admin:** `/admin`, `/admin/enrollments`, `/admin/courses`, `/admin/courses/[id]`, `/admin/modules/[id]/sessions`, `/admin/modules/[id]/materials`, `/admin/modules/[id]/test`, `/admin/modules/[id]/results`, `/admin/users`

### Design

- Simple and clean. Inter font, one primary colour (indigo-600), slate neutrals.
- Status colours: **green** = passed, **amber** = active, **slate** = locked, **red** = failed.
- Every module status is shown the same way: a badge, plus a lock icon when the module is locked.
- Cards have a 12px radius. Spacing follows an 8px grid. Content is at most 1200px wide.
- Mobile-first: every page must be usable at 375px.
- Times are stored in UTC and shown in the viewer's local time.

## 7. Sprint roadmap

### S0: Setup ✅

Monorepo (pnpm + Turborepo), Next.js and NestJS apps, `packages/shared`, Postgres in docker-compose, Prisma schema + first migration, seed data, Tailwind + shadcn/ui layout shells, CI workflow, root scripts.

### S1: Auth + catalog ✅

- **API:** the complete auth module (register, login, refresh, logout, forgot/reset password with emails printed to the console in dev), role guards, users endpoints, public and admin course endpoints.
- **Web:** home, catalog, course detail (the Enroll button sends logged-out users to login), register, login, forgot/reset password, per-role dashboard placeholders, admin user management, profile.
- **Tests:** unit tests for the auth and courses services, plus an e2e test (register → login → `GET /users/me`).

### S2: Enrollment + sessions + materials

- **Enrollments:** the admin approval queue (approving creates ModuleProgress rows) and the student "My courses" view.
- **Admin course and module management:** CRUD pages and instructor assignment.
- **Live sessions:** CRUD and attendance for instructors and admins, the student's upcoming sessions, and the "Join on Google Meet" button that activates 15 minutes before the start.
- **Materials:** links and file uploads.
- **Module access:** `GET /modules/:id` requires an enrollment and an unlocked module.

### S3: Tests + progression + dashboards

- Test builder (questions and options), publishing, and test windows.
- Student attempt flow with a timer and autosave. Server-side grading, expiry, and the transactional unlock of the next module.
- Results pages for instructors and admins, plus manual unlock/reset.
- Student dashboard with progress per course, admin overview stats, `GET /me/progress`.

### S4: QA + launch

- Playwright e2e for the main flows, accessibility and mobile pass, and security review (rate limits, headers, CORS).
- Production email provider (needs approval; it may be a paid service), deployment behind a reverse proxy that sets `X-Forwarded-For` (see D3), backups, monitoring.

## 8. Decisions log

- **D1.** NestJS 12 and Prisma 7 are ESM-only, and the official Nest 12 starter uses Vitest, so API tests use **Vitest** instead of Jest (approved by the product owner). The API is close to Jest's (`describe/it/expect`, `vi.fn` instead of `jest.fn`).
- **D2.** The data model has no token tables, so refresh and reset tokens are **stateless JWTs**:
  - The refresh token lives in an httpOnly cookie. Logout clears the cookie.
  - Both refresh and reset tokens are signed with the secret plus a fingerprint of the user's current password hash. Changing or resetting the password therefore invalidates every outstanding refresh and reset token, which also makes reset tokens single-use.
  - Server-side revocation of individual sessions would need a `RefreshToken` table, which is a proposed data-model change for a later sprint.
- **D3.** The web app proxies `/api/v1/*` to the API through a Next.js rewrite. The browser stays same-origin: no CORS preflights, and the refresh cookie is first-party.
  - The rewrite passes an incoming `X-Forwarded-For` through but does not add the client IP itself. The API trusts loopback proxies (`TRUST_PROXY`), so per-IP rate limiting needs a load balancer or reverse proxy in front of Next.js that sets `X-Forwarded-For`, which is standard for any production deployment. Without one, all users share one rate-limit bucket (verified in S1). This is an S4 deployment requirement.
- **D4.** TypeScript is pinned to 6.0.x. TypeScript 7 is not yet supported by typescript-eslint.
- **D5.** Prisma is pinned to the latest stable 7.x. npm's `latest` tag currently points at an 8.0 release candidate.
- **D6.** The student-side `POST /courses/:id/enroll` (create a PENDING request) and `GET /me/enrollments` were pulled into S1 so the Enroll button does something real. The admin approval flow is still S2.
- **D7.** The web app runs Next.js 16 with Cache Components (the create-next-app default):
  - Public pages fetch the API inside `<Suspense>` without `'use cache'`, so `next build` never needs the API to be running.
  - The signed-in area (`(app)/`) is client-rendered behind `RequireAuth` (the access token lives in memory), and `instant = false` marks it as not prerenderable.
  - `src/proxy.ts` redirects visitors without the session cookie to `/login` (UX only).
