# AI Academy: Product & Delivery Plan

AI Academy is a simple LMS for live, cohort-based courses on AI and digital marketing.

## 1. Product (MVP)

Tracks cover AI (basics → AI integration → AI coding → AI in your profession) and digital marketing.

- Classes happen **live on Google Meet**. The platform only stores the Meet link for each session.
- Students register on the site and request enrollment in a course. An admin approves the request, which unlocks **Module 1**.
- Each module lasts about **one month** and ends with an **online test**. Passing the test unlocks the next module.
- A bilingual **marketing landing page** (`/sq`, `/en`; Albanian first) sells the platform. Its one goal is to turn a visitor into a registration (see §6.1).

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

Online payments (an admin approves enrollment manually), certificates, video hosting, the Google Calendar API, chat, and i18n of the signed-in app (it stays English for now; only the landing page is bilingual).

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

| Area      | Choice                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo, TypeScript everywhere, ESLint + Prettier                                                  |
| Web       | Next.js (App Router), Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form + zod                                   |
| API       | NestJS, Prisma ORM, PostgreSQL, Passport JWT (access + refresh tokens), bcrypt, class-validator DTOs                   |
| API paths | Global prefix `/api/v1`, Swagger at `/api/docs`                                                                        |
| Shared    | `packages/shared`: zod schemas, enums, and API types used by both web and api                                          |
| Local dev | `docker-compose.yml` with PostgreSQL 16, plus a `.env.example` in each app                                             |
| Tests     | **Vitest** for API unit and e2e tests (see decision D1), Playwright for web (landing page now; main flows in Sprint 4) |
| CI        | GitHub Actions: install, lint, type-check, test                                                                        |

## 4. Data model

`apps/api/prisma/schema.prisma` is the source of truth. Entities:

- `User`: email (unique), passwordHash, firstName, lastName, phone?, role (`STUDENT` | `INSTRUCTOR` | `ADMIN`), plus a public instructor profile: avatarUrl?, title?, bio?
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
- `Testimonial`: name, role?, quote, avatarUrl?, isPublished, locale (`sq` | `en`). Only real quotes; never seeded.
- `SiteSettings`: singleton row (id 1) holding nextCohortStart?, scheduleSq?/scheduleEn?, seatsTotal?, priceAmount? (whole units; null shows "contact us"), priceCurrency, priceNoteSq?/priceNoteEn?, contactEmail?, contactPhone?, whatsappNumber?

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
| landing     | `GET /instructors`, `GET /testimonials?locale=`, `GET /site-settings` (public); `PATCH /site-settings` (admin)                                                                                                                                                                  |

## 6. Pages (Next.js)

- **Public:** `/` (redirects to `/sq` or `/en`), `/[locale]` landing page, `/courses`, `/courses/[slug]`, `/register`, `/login`, `/forgot-password` (+ `/reset-password`)
- **Student:** `/dashboard`, `/learn/[courseSlug]`, `/learn/[courseSlug]/[moduleId]` (sessions with a "Join on Google Meet" button that becomes active 15 minutes before the start, materials, a test card), `/tests/[testId]`, `/tests/[testId]/result`, `/profile`
- **Admin:** `/admin`, `/admin/enrollments`, `/admin/courses`, `/admin/courses/[id]`, `/admin/modules/[id]/sessions`, `/admin/modules/[id]/materials`, `/admin/modules/[id]/test`, `/admin/modules/[id]/results`, `/admin/users`

### Design

- Simple and clean. Inter font, one primary colour (indigo-600), slate neutrals.
- Status colours: **green** = passed, **amber** = active, **slate** = locked, **red** = failed.
- Every module status is shown the same way: a badge, plus a lock icon when the module is locked.
- Cards have a 12px radius. Spacing follows an 8px grid. Content is at most 1200px wide.
- Mobile-first: every page must be usable at 375px.
- Times are stored in UTC and shown in the viewer's local time.

### 6.1 Marketing landing page (`/[locale]`, built before S2)

The page has one goal: a registration. Its sections, in order, each a component in `apps/web/src/components/landing/`:

1. **Hero:** headline, one-line promise, "next cohort starts <date>" badge, "Register now" (→ `/register`) and "See courses" (→ `#tracks`). Beside them, an HTML/CSS visual of the module path (lock → unlocked).
2. **Why now:** three points, with no invented statistics.
3. **How it works:** Register → live classes on Google Meet → monthly test → next module unlocks, then a CTA.
4. **Tracks** (`#tracks`): the published courses from the API, each with its 4 modules in order, ~1 month per module, a language badge, and "View track".
5. **Who it's for:** professionals, business owners, marketers, students, career changers.
6. **Why us:** live instructors, practical projects, taught in Albanian, progress proven by tests, one module at a time, support between classes.
7. **Instructors:** users with role INSTRUCTOR (photo, name, title, bio). Hidden when there are none.
8. **Testimonials:** only real, published ones for the current locale; the section is hidden otherwise.
9. **Next cohort and price:** values from `SiteSettings`, so they change without a deploy. Then "Reserve your seat".
10. **FAQ:** 8 questions in an accordion.
11. **Final CTA band** with contact details (email, phone, WhatsApp), then the footer.

Other requirements:

- **Header and mobile:** a sticky header with anchors, a language switch, Login and Register. On phones, a sheet menu and a sticky bottom "Register now" bar.
- **Copy:** in `apps/web/messages/{sq,en}.json` (`landing` namespace). Albanian is written natively, not translated.
- **SEO:** server-rendered, per-locale metadata, hreflang alternates, Open Graph image, `sitemap.xml`, `robots.txt`, and JSON-LD (EducationalOrganization, Course list, FAQPage).
- **Analytics:** every CTA calls `track('cta_click', { cta, href, locale })`. It is a no-op until GA or Plausible is chosen.
- **Quality bar:** Lighthouse Performance ≥ 90, Accessibility ≥ 95, SEO 100, at 375 / 768 / 1280 px. Playwright covers `/sq` and `/en`.

## 7. Sprint roadmap

### S0: Setup ✅

Monorepo (pnpm + Turborepo), Next.js and NestJS apps, `packages/shared`, Postgres in docker-compose, Prisma schema + first migration, seed data, Tailwind + shadcn/ui layout shells, CI workflow, root scripts.

### S1: Auth + catalog ✅

- **API:** the complete auth module (register, login, refresh, logout, forgot/reset password with emails printed to the console in dev), role guards, users endpoints, public and admin course endpoints.
- **Web:** home, catalog, course detail (the Enroll button sends logged-out users to login), register, login, forgot/reset password, per-role dashboard placeholders, admin user management, profile.
- **Tests:** unit tests for the auth and courses services, plus an e2e test (register → login → `GET /users/me`).

### S1.5: Marketing landing page ✅

- **Landing:** the bilingual landing page (§6.1) and the `/` language redirect, plus the per-locale root layout.
- **API:** instructor profile fields, the `Testimonial` and `SiteSettings` models with their public endpoints, and admin `PATCH /site-settings`.
- **Profile:** instructors can edit their public profile (title, bio, photo) on `/profile`.
- **Tests:** Playwright tests for `/sq` and `/en`.

### S2: Enrollment + sessions + materials

- **Enrollments:** the admin approval queue (approving creates ModuleProgress rows) and the student "My courses" view.
- **Admin course and module management:** CRUD pages and instructor assignment.
- **Live sessions:** CRUD and attendance for instructors and admins, the student's upcoming sessions, and the "Join on Google Meet" button that activates 15 minutes before the start.
- **Materials:** links and file uploads.
- **Module access:** `GET /modules/:id` requires an enrollment and an unlocked module.
- **Landing admin:** CRUD for testimonials (`/admin/testimonials`), a site settings form (`/admin/settings`), and admin editing of instructor profiles.

### S3: Tests + progression + dashboards

- Test builder (questions and options), publishing, and test windows.
- Student attempt flow with a timer and autosave. Server-side grading, expiry, and the transactional unlock of the next module.
- Results pages for instructors and admins, plus manual unlock/reset.
- Student dashboard with progress per course, admin overview stats, `GET /me/progress`.

### S4: QA + launch

- Plug an analytics provider (GA4 or Plausible) into `track()`. Decide whether course and module content needs Albanian versions (see D11).
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
- **D8.** The landing page's i18n is native, not a library: typed JSON messages plus `next/root-params` (`locale()`) in server components, and strings passed as props to the few client components. This avoids compatibility risk with Cache Components; next-intl can be adopted later if the whole app goes bilingual. Browsers ship no Albanian Intl data, so Albanian dates use translated month names.
- **D9.** The app has two root layouts: `app/[locale]/layout.tsx` (`<html lang="sq|en">`) and `app/(site)/layout.tsx` (`lang="en"`), plus `global-not-found.tsx` (an experimental flag). Navigating between them is a full page load, which is acceptable for landing → register.
- **D10.** Landing values that change often (cohort date, schedule, seats, price, contact) live in a `SiteSettings` database row, not a config file, so they change without a deploy. The page renders them per request.
- **D11.** Course and module titles and descriptions come from the database in English, so on `/sq` the track cards show English course content inside Albanian copy. Localizing that content would need per-locale fields, which is a data-model change for the product owner to decide.
