# AI Academy: Product & Delivery Plan

AI Academy is a simple LMS for live, cohort-based courses on AI and digital marketing.

## 1. Product (MVP)

Tracks cover AI (basics → AI integration → AI coding → AI in your profession) and digital marketing.

- Classes happen **live on Google Meet** with senior professionals. The platform only stores the Meet link for each session.
- Three courses: **Development & Vibe Coding përmes AI** (`vibe-coding-ai`), **Digital Marketing & AI** (`digital-marketing-ai`), **SEO përmes AI** (`seo-ai`). Each costs **€89 a month** (shown as a discount from the standard €150), stored in cents on the course and editable in the admin.
- Students enrol in a **group** (cohort) of at most **10 people**, on a weekly schedule (e.g. Mon/Wed/Fri 19:00–21:00 Europe/Tirane). A month = one module = **12 live lectures of 2 hours** (3 a week, 24 hours a month). The first groups start on **1 November 2026**.
- Registration requires **payment**: Stripe Checkout (card, default) or bank transfer. An enrollment counts only when the first month's payment is CONFIRMED. Each month is paid separately.
- Each module ends with an **online test**. The next module opens when the test is passed **and** that month is paid.
- Between lectures, students learn **offline** from short Markdown lessons in their panel.
- The platform is **Albanian only**: public site, panels, emails, validation and error messages.
- The marketing landing page (`/sq`) sells the three courses and the launch offer. Its one goal is to turn a visitor into a paid registration (see §6.1).

### Courses (seed data, `apps/api/prisma/catalog.ts`)

| Course                              | Module 1                       | Module 2                       | Module 3                       | Module 4                            |
| ----------------------------------- | ------------------------------ | ------------------------------ | ------------------------------ | ----------------------------------- |
| Development & Vibe Coding përmes AI | Bazat e kodimit me AI          | Aplikacione web me AI          | Të dhëna, API dhe automatizime | Publikimi dhe projekti përfundimtar |
| Digital Marketing & AI              | Strategjia dhe audiencat me AI | Përmbajtja dhe rrjetet sociale | Reklamat me pagesë             | Analitika dhe automatizimi          |
| SEO përmes AI                       | Bazat e SEO-së dhe fjalët kyçe | Përmbajtja që renditet         | SEO teknike                    | Linket, autoriteti dhe raportimi    |

The module titles and descriptions are a starting point for the product owner to adjust.

### Roles

- **STUDENT** registers, requests enrollment, attends sessions, takes tests.
- **INSTRUCTOR** manages only the modules assigned to them (sessions, attendance, materials, tests, results).
- **ADMIN** can do everything.

### Out of scope

Certificates, video hosting (lessons embed YouTube/Vimeo), the Google Calendar API (the platform sends an `.ics`), chat, and an English version of the site (the English copy stays in `messages/en.json` for later).

## 2. Business rules

### Groups, payment and enrollment

1. A student picks a **group** of a course and a payment method at checkout. Inside one transaction the group row is locked and the free seats counted (seats taken = `APPROVED` enrollments + `PENDING_PAYMENT` enrollments whose hold hasn't expired). With a free seat the enrollment becomes `PENDING_PAYMENT` with a hold (Stripe: 30 minutes, bank transfer: 48 hours); a full group makes it `WAITLISTED`. There is at most one enrollment per user and course.
2. A `Payment` covers one month (module). It is `CONFIRMED` by the Stripe webhook (never by the success redirect) or by an admin for bank transfers. Confirming the first month activates the enrollment (`APPROVED`): one `ModuleProgress` row per module, module 1 `ACTIVE`, the rest `LOCKED`. The student gets the registration email with the month's 12 lectures and an `.ics`.
3. Unpaid holds expire (`EXPIRED` payment and enrollment) and free the seat; bank-transfer holds get a warning 12 hours before. Admins can move waitlisted students into a group (48-hour hold) and record payments received outside the platform.
4. A student can open a module only if they are enrolled (`APPROVED`), the module is not `LOCKED`, and (for the live sessions) only their group's lectures are shown.
5. Admins can still approve a request by hand (free seats); the legacy `PENDING` request stays for that.

### Tests

- Defaults, editable per test: **pass mark 70%**, **45-minute** time limit, **2 attempts**. The test window opens in the **last week of the module**.
- Question types: `SINGLE_CHOICE`, `MULTI_CHOICE`, `TRUE_FALSE`.
- **Grading happens only on the server.** Correct answers (`Option.isCorrect`) are never sent to students, neither when an attempt starts nor while it is in progress.
- A passed attempt sets the module to `PASSED` and opens the next module (`order + 1`) in **one Prisma transaction**, but only if that month is paid; otherwise it opens when the payment is confirmed (`unlockIfReady` runs in both places).
- With no attempts left, the module stays `FAILED` until an admin resets attempts or unlocks it manually (`PATCH /progress/:id`).
- An attempt that runs past its time limit becomes `EXPIRED`, and the server grades whatever answers were saved.

### Emails (Albanian, logged in `EmailLog`, idempotent by `uniqueKey`)

Registration confirmed (timetable + `.ics`), lecture reminders 24 h and 1 h before (to students who paid the month), the offline-learning email at 09:00 Europe/Tirane on days without a lecture (students can opt out of this one only), payment pending/confirmed/failed, hold expiring (12 h before, bank) and expired, refund issued, waitlist joined, seat offered. Jobs run inside the API with `@nestjs/schedule`.

### Time

All times are stored in UTC and displayed in **Europe/Tirane**, in Albanian (the academy's time zone, where lectures are scheduled). Browsers ship no Albanian Intl data, so month and weekday names come from `@ai-academy/shared`.

## 3. Tech stack

| Area      | Choice                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo  | pnpm workspaces + Turborepo, TypeScript everywhere, ESLint + Prettier                                                          |
| Web       | Next.js (App Router), Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form + zod                                           |
| API       | NestJS, Prisma ORM, PostgreSQL, Passport JWT (access + refresh tokens), bcrypt, class-validator DTOs                           |
| API paths | Global prefix `/api/v1`, Swagger at `/api/docs`                                                                                |
| Shared    | `packages/shared`: zod schemas, enums, and API types used by both web and api                                                  |
| Local dev | `docker-compose.yml` with PostgreSQL 16, plus a `.env.example` in each app                                                     |
| Tests     | **Vitest** for API unit and e2e tests (see decision D1), Playwright for web (landing, main journeys, axe WCAG 2.1 AA)          |
| CI        | GitHub Actions: install, format, lint, type-check, unit tests, build, API e2e, Playwright                                      |
| Hosting   | One Hetzner Cloud server (CX23) with Docker Compose: Postgres, API, web, Caddy (HTTPS), backups to R2. See docs/DEPLOY.md, D28 |

## 4. Data model

`apps/api/prisma/schema.prisma` is the source of truth. Entities:

- `User`: email (unique), passwordHash, firstName, lastName, phone?, role (`STUDENT` | `INSTRUCTOR` | `ADMIN`), plus a public instructor profile: avatarUrl?, title?, bio?
- `Course`: slug (unique), title, summary, description, titleSq?/summarySq?/descriptionSq? (Albanian, D11), coverUrl?, startDate?, isPublished
- `Module`: course, order (unique per course), title, description, titleSq?/descriptionSq? (Albanian, D11), durationWeeks (4), instructor?
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
- `SiteSettings`: singleton row (id 1) holding nextCohortStart?, scheduleSq?/scheduleEn?, seatsTotal?, priceAmount?, priceCurrency, priceNoteSq?/priceNoteEn?, contactEmail?, contactPhone?, whatsappNumber?, stripeEnabled, bankTransferEnabled, bankBeneficiary?/bankIban?/bankName?/bankSwift?
- `Course` also has priceCents (8900), listPriceCents? (15000), currency ("EUR").
- `Group`: course, name, startDate/endDate (dates), weekdays (0–6), startTime ("HH:mm"), durationMin (120), timezone, capacity (≤ 10), status (`OPEN` | `FULL` | `RUNNING` | `FINISHED`), instructor?, meetUrl?, offlineEmailDays
- `Enrollment` gains group?, holdExpiresAt? and the statuses `PENDING_PAYMENT`, `WAITLISTED`, `EXPIRED`; `LiveSession` gains group?
- `Payment`: enrollment, module, amountCents, currency, provider (`STRIPE` | `BANK_TRANSFER`), status (`PENDING` | `CONFIRMED` | `FAILED` | `REFUNDED` | `EXPIRED`), reference (unique), stripeSessionId?/stripePaymentIntentId?/stripeChargeId?/receiptUrl?, holdExpiresAt?, note?, confirmedAt?/confirmedBy?, failedAt?, refundedAt?
- `StripeEvent`: processed webhook event ids
- `Lesson`: module, order, title, content (Markdown), videoUrl?, estimatedMin?; `LessonProgress`: user + lesson, completedAt; `Material` gains lesson?
- `EmailLog`: user?, to, type (`EmailType`), uniqueKey (unique), subject, status (`PENDING` | `SENT` | `FAILED`), error?, meta?
- `User` gains offlineEmailsEnabled

Changes to the data model need the product owner's approval first.

## 5. API (REST, `/api/v1`, `JwtAuthGuard` + `RolesGuard`)

| Area        | Endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth        | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| users       | `GET/PATCH /users/me`; `GET /users`, `PATCH /users/:id/role` (admin)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| courses     | `GET /courses`, `GET /courses/:slug` (public); `POST/PATCH/DELETE` (admin)                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| modules     | `POST /courses/:id/modules`, `PATCH /modules/:id`, `DELETE /modules/:id` (last module, nobody started; admin); `GET /modules/:id` (enrolled + unlocked, the module's instructor, admins); `GET /me/modules` (instructor/admin); `GET /me/courses/:slug` (approved student)                                                                                                                                                                                                                                                              |
| enrollments | `POST /courses/:id/enroll`, `GET /me/enrollments` (student); `GET /enrollments?status=&courseId=`, `PATCH /enrollments/:id` approve/reject (admin; approving creates the ModuleProgress rows)                                                                                                                                                                                                                                                                                                                                           |
| sessions    | `GET/POST /modules/:id/sessions`, `PATCH/DELETE /sessions/:id`, `GET/PUT /sessions/:id/attendance` (instructor of the module/admin); `GET /me/sessions/upcoming` (student)                                                                                                                                                                                                                                                                                                                                                              |
| materials   | `POST /modules/:id/materials` (JSON link or multipart file), `DELETE /materials/:id` (instructor/admin); `GET /materials/:id/download` (same access as `GET /modules/:id`)                                                                                                                                                                                                                                                                                                                                                              |
| tests       | `GET/POST /modules/:id/test` (builder data with correct answers / create), `PATCH/DELETE /tests/:id`, `PUT /tests/:id/questions` (locked once anyone has started), `PATCH /tests/:id/publish`, `GET /tests/:id/results` (instructor of the module/admin); `GET /tests/:id`, `POST /tests/:id/attempts` (start or resume; no answers in the response), `GET/PATCH /attempts/:id` (resume / autosave), `POST /attempts/:id/submit` (student); `PATCH /progress/:id` (admin: `ACTIVE` unlocks or resets attempts, `PASSED` passes by hand) |
| progress    | `GET /me/progress` (student); `GET /admin/stats` (admin overview numbers)                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| landing     | `GET /instructors`, `GET /testimonials?locale=`, `GET /site-settings` (public); `PATCH /site-settings`, `GET /testimonials?all=true`, `POST/PATCH/DELETE /testimonials/:id`, `PATCH /users/:id/profile` (admin)                                                                                                                                                                                                                                                                                                                         |
| groups      | `GET /groups?courseId=`, `GET /groups/:id` (public, with seats left); `GET /admin/groups`, `GET /admin/groups/:id`, `POST /courses/:id/groups`, `PATCH /groups/:id`, `POST /groups/:id/sessions/regenerate`, `DELETE /groups/:id`, `GET /groups/:id/students` (admin; instructors read their own); `PATCH /enrollments/:id/move` (waitlist → group)                                                                                                                                                                                     |
| payments    | `GET /payments/methods` (public); `POST /checkout` (first month, holds a seat), `POST /enrollments/:id/payments` (later months), `GET /me/payments`, `GET /me/payments/:id` (student); `POST /payments/stripe/webhook` (Stripe, raw body + signature); `GET /payments`, `GET /payments/export.csv`, `POST /payments/:id/confirm`, `/reject`, `/refund`, `POST /payments/manual`, `GET /payments/:id/stripe-session` (admin)                                                                                                             |
| lessons     | `GET /modules/:id/lessons`, `GET /lessons/:id` (same access as the module), `POST /lessons/:id/complete`, `GET /me/next-lesson` (student); `POST /modules/:id/lessons`, `PUT /modules/:id/lessons/order`, `PATCH/DELETE /lessons/:id` (instructor of the module/admin)                                                                                                                                                                                                                                                                  |
| emails      | `GET /admin/emails?type=&status=` (admin)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 6. Pages (Next.js)

- **Public:** `/` (redirects to `/sq`; `/en/...` → `/sq/...` with 301), `/sq` landing page, `/courses`, `/courses/[slug]` (groups with real seats, price), `/register`, `/login`, `/forgot-password` (+ `/reset-password`)
- **Student:** `/checkout/[groupId]` (+ `?module=` for later months), `/checkout/success` (waits for the webhook), `/payments/[id]` (bank details, receipt), `/dashboard` (upcoming sessions, "continue where you left off", my courses with payment state), `/learn/[courseSlug]` (modules with paid/unpaid), `/learn/[courseSlug]/[moduleId]` (test card, the group's sessions with "Hyr në Google Meet" 15 minutes before, offline lessons, materials), `/learn/[courseSlug]/[moduleId]/lessons/[lessonId]`, `/tests/[testId]`, `/tests/[testId]/result`, `/profile` (offline-email opt-out)
- **Instructor (and admin):** `/teach` (my modules), `/teach/modules/[id]` (sessions, materials and a test summary), `/teach/modules/[id]/test` (builder), `/teach/modules/[id]/results`, `/teach/sessions/[id]` (attendance). See D14.
- **Admin:** `/admin`, `/admin/enrollments` (incl. waitlist moves), `/admin/groups`, `/admin/groups/[id]`, `/admin/payments`, `/admin/emails`, `/admin/courses`, `/admin/courses/[id]` (details, prices, modules, instructor assignment), `/admin/users`, `/admin/instructors`, `/admin/testimonials`, `/admin/settings` (payment methods, bank details)

### Design

- Clean, bright and playful, "learn by doing" (D12). Plus Jakarta Sans; ink (#141414) as the primary colour on white and a warm off-white (#F7F6F3); violet for the AI track and orange for the marketing track. The full system is at `/design` (dev only), and the rules are in CLAUDE.md.
- Status colours: **green** = passed, **amber** = active, **slate** = locked, **red** = failed.
- Every module status is shown the same way: a badge, plus a lock icon when the module is locked.
- Cards have a 16px radius, buttons 14px, pills fully round. Primary buttons and clickable cards are "pressable" (2px outline and a solid bottom shadow). Spacing follows an 8px grid. Content is at most 1200px wide.
- Mobile-first: every page must be usable at 375px.
- Times are stored in UTC and shown in the viewer's local time.

### 6.1 Marketing landing page (`/[locale]`, built before S2)

The page has one goal: a registration. Its sections, in order, each a component in `apps/web/src/components/landing/`:

1. **Hero:** centered headline, one-line promise, "next cohort starts <date>" badge, "I want to learn" (→ `/register`) and "See courses" (→ `#tracks`). Below them, topic tabs (AI Basics, AI Coding, Digital Marketing, AI at Work) that switch an interactive demo card: one quiz question with instant feedback and an explanation, then "This is how our monthly tests feel → Start now".
2. **Proof band:** three big numbers that are true for every cohort (4 modules per track, 100% live classes, 70% to pass). No learner counts or reviews.
3. **Why now:** three points, with no invented statistics.
4. **How it works:** Register → live classes on Google Meet → monthly test → next module unlocks, as alternating illustrated rows, then a CTA.
5. **Tracks** (`#tracks`): the published courses from the API in their track tint, each with its 4 modules as a path (module 1 open, the rest locked), ~1 month per module, a language badge, and "View track".
6. **Who it's for:** professionals, business owners, marketers, students, career changers.
7. **Why us:** live instructors, practical projects and taught in Albanian as illustrated rows; progress proven by tests, one module at a time and support between classes as cards.
8. **Instructors:** users with role INSTRUCTOR (photo, name, title, bio). Hidden when there are none.
9. **Testimonials:** only real, published ones for the current locale; the section is hidden otherwise.
10. **Next cohort and price:** values from `SiteSettings`, so they change without a deploy. Then "Reserve your seat".
11. **FAQ:** 8 questions in an accordion.
12. **Final CTA band** (black, white chunky button) with contact details (email, phone, WhatsApp), then a footer with Platform / Courses / Company / Contact columns and the language switch.

Other requirements:

- **Header and mobile:** a sticky white header with anchors in the middle, a language switch, a "Log in" text link and a chunky "Start now" button. On phones, a sheet menu and a sticky bottom "Register now" bar.
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

### S2: Enrollment + sessions + materials ✅

- **Enrollments:** the admin approval queue (approving creates ModuleProgress rows) and the student "My courses" view.
- **Admin course and module management:** CRUD pages and instructor assignment.
- **Live sessions:** CRUD and attendance for instructors and admins, the student's upcoming sessions, and the "Join on Google Meet" button that activates 15 minutes before the start.
- **Materials:** links and file uploads.
- **Module access:** `GET /modules/:id` requires an enrollment and an unlocked module.
- **Landing admin:** CRUD for testimonials (`/admin/testimonials`), a site settings form (`/admin/settings`), and admin editing of instructor profiles.

### S3: Tests + progression + dashboards ✅

- Test builder (questions and options), publishing, and test windows.
- Student attempt flow with a timer and autosave. Server-side grading, expiry, and the transactional unlock of the next module.
- Results pages for instructors and admins, plus manual unlock/reset.
- Student dashboard with progress per course, admin overview stats, `GET /me/progress`.

### S4: QA + launch ✅

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
- **D11.** Course and module titles and descriptions come from the database in English, so on `/sq` the track cards showed English course content inside Albanian copy. **Resolved in S4** (product owner approved the schema change): courses have optional `titleSq`, `summarySq` and `descriptionSq`, modules `titleSq` and `descriptionSq`. The `/sq` landing page uses them and falls back to English for empty fields; admins edit them in the course and module forms. The signed-in app and the public catalog stay English.
- **D12.** Design refresh before S2: the indigo/slate look was replaced by a brighter, playful "learn by doing" system (ink primary, warm off-white, violet/orange track accents, pressable buttons and cards, original SVG illustrations, an interactive quiz in the hero). All of it is our own work; nothing is copied from reference sites. Tokens live in `globals.css` and are reviewed at `/design`.
- **D13.** A course's accent colour is derived from its slug (`marketing` in the slug → orange, otherwise violet) because courses have no category field. Adding one is a schema change for the product owner to decide.
- **D14.** Module management (sessions, attendance, materials) lives under `/teach/*`, not `/admin/modules/*`: instructors need the same pages for their own modules, and `/admin/*` is admin-only. Admins reach them from the course editor. The API still checks `module.instructorId === user.id` for instructors.
- **D15.** (Storage superseded by D27.) Uploaded materials are stored on the API server's disk (`UPLOAD_DIR`, default `apps/api/uploads`, gitignored), behind a small `StorageService` so an object store can replace it later. That needs a paid service, so the product owner decides. Files are at most 20 MB, use an allow-list of extensions, and are only downloadable through `GET /materials/:id/download` with the same access rules as the module page (always as an attachment, `nosniff`). A production deploy needs a persistent, backed-up volume for that folder.
- **D16.** The server, not the browser, enforces the join window: students get a session's Meet link only from 15 minutes before the start until it ends; staff always see it. Pages with Join buttons refetch every 30 seconds.
- **D17.** Admins can give a FAILED student another try without a schema change: attempts only count against `maxAttempts` when they started after `ModuleProgress.unlockedAt`, and a reset (`PATCH /progress/:id` with `ACTIVE`) sets `unlockedAt` to now. Old attempts stay on record. Resets and manual passes are admin-only (§2); instructors see the results.
- **D18.** An attempt's deadline is the start plus the time limit, but never later than the window's close. Saves and submissions are accepted for 30 seconds after it (network lag). Overdue attempts are graded as `EXPIRED` with their saved answers when anyone reads them, and by a sweep every 60 seconds, so a module's status is right even if the student never comes back. Start, grade and admin override lock the student's `ModuleProgress` row (`SELECT … FOR UPDATE`), so they can't race.
- **D19.** Grading: a question earns its points only when the chosen options are exactly the correct ones (multiple choice is all-or-nothing), and the percentage is rounded down. After handing in, students see their score but not which answers were right, because that would give away a retake. Questions can't change once anyone has started an attempt.
- **D20.** (Superseded by D28.) Hosting (product owner, S4): one VPS running `deploy/docker-compose.yml`. Postgres, the API, the web app and a migrate job are built from one `Dockerfile`; Caddy terminates HTTPS with automatic Let's Encrypt certificates, sets HSTS and `X-Forwarded-For`, and the API trusts the private Docker network (`TRUST_PROXY=loopback, uniquelocal`), which satisfies D3. Uploads (D15) live on a named volume. `deploy/backup.sh` dumps the database and archives uploads nightly; copying them off the server is the product owner's choice of storage. Production has no seed data: the first admin registers and is promoted with `scripts/promote-admin.ts`. The runbook is `docs/DEPLOY.md`.
- **D21.** Email (product owner, S4): any SMTP provider through nodemailer (`MAIL_TRANSPORT=smtp`); console stays the development default. `MailService.send` logs failures instead of throwing, and the password reset doesn't wait for the send, so neither errors nor timing reveal whether an account exists.
- **D22.** Analytics (product owner, S4): Google Analytics 4, which sets cookies, so it sits behind a consent banner (`components/analytics/analytics.tsx`). Nothing loads before the visitor accepts, declining is as easy as accepting, the choice is kept in `localStorage`, and "Cookie settings" in the footers asks again. Without `NEXT_PUBLIC_GA_ID` there is no banner and no script. Consent Mode sets ad storage and personalization to denied.
- **D23.** Security headers: the API uses helmet (no CSP; it only serves JSON and attachments) and hides Swagger in production unless `SWAGGER_ENABLED=true`. The web app sends nosniff, `X-Frame-Options: DENY`, a referrer policy and a permissions policy, plus a Content-Security-Policy in production builds. `script-src` keeps `'unsafe-inline'` because Next inlines its RSC payload; nonces would make every page dynamic. Google Analytics is the only third party allowed. HSTS comes from Caddy. `pnpm audit --prod` (S4) reports four findings, all in build or CLI tooling that never runs in the app (mysql2 and deepmerge-ts under the Prisma CLI, braces under shadcn); the fixed versions were too new for pnpm's release-age guard, so re-check them at the next dependency update.
- **D24.** The Playwright suite runs against production builds of the web app and the API on their own database (`ai_academy_e2e`, created by `apps/api/test/web-e2e-server.ts`), because the API e2e suite empties `ai_academy_test` when it starts and both can run at once. Playwright never reuses an API already on :4000, so a running dev API makes the run fail instead of writing into the dev database.
- **D25.** Auth forms (login, register, forgot and reset password) stay disabled until React hydrates. Before hydration, typed text was lost, and a submit was a native GET that put the email and password in the URL. The forms also use `method="post"` as a fallback.
- **D26.** Production domains (product owner): the web app at `avenir.academy` (`www` redirects with 308) and the API at `api.avenir.academy`. The browser calls the API directly (`NEXT_PUBLIC_API_URL`, baked at build time; `credentials: 'include'`), so CORS allows only `https://avenir.academy` and exposes `Content-Disposition` for downloads. The refresh cookie gets `Domain=.avenir.academy` (`COOKIE_DOMAIN`), `Secure`, `HttpOnly`, `SameSite=Lax` (the two hosts are the same site), so `proxy.ts` on the web host still sees it. Without `NEXT_PUBLIC_API_URL` (development, Playwright) the same-origin rewrite of D3 is used as before.
- **D27.** Material files in Cloudflare R2 (product owner): `StorageService` has two drivers, `STORAGE_DRIVER=local` (disk, development and tests) and `s3` (any S3-compatible bucket; R2 in production). The bucket stays private and files are still streamed through `GET /materials/:id/download`, so the access rules of D15 hold and the bucket needs no CORS or public URLs. The 20 MB limit is unchanged; Caddy allows 25 MB request bodies for the multipart envelope.
- **D29.** Albanian only (product owner, launch): the whole platform is in Albanian, from `apps/web/messages/sq.json` (`t.*` in components) and Albanian strings in the API (validation through one `exceptionFactory`, every thrown message, every email). `/en/...` redirects to `/sq/...` with 301, there is no language switch and no hreflang; `messages/en.json` stays for later and a test guarantees every English key also exists in Albanian. A second test flags hard-coded English in JSX. Dates are shown in Europe/Tirane with Albanian names from the shared package (D8 still holds: no i18n library).
- **D30.** Groups (product owner, launch): students enrol in a `Group` of at most 10. Lectures are generated from the group's weekly schedule, 12 per module (the first on or after the start date; 1 November 2026 is a Sunday, so the first groups start Monday the 2nd), and can be edited afterwards. Overbooking is prevented by `SELECT … FOR UPDATE` on the group row while counting seats; a race test fires five checkouts at a two-seat group. Seats taken include active holds, so a Stripe session in progress keeps its seat for 30 minutes and a bank transfer for 48 hours.
- **D31.** Payments (product owner, launch): a `PaymentProvider` interface with `StripeProvider` (hosted Checkout, `price_data` from the course, `locale: auto` because Stripe has no Albanian, 30-minute expiry, `client_reference_id` = our payment id, signed webhooks on a raw-body route with `StripeEvent` dedup, refunds through the API) and `BankTransferProvider` (IBAN + reference `AV-XXXXXXXX`, admin confirmation). Only the webhook confirms a card payment. Each month is paid separately and the next module opens only when the test is passed and the month is paid (`unlockIfReady`). Admins can record manual payments for money received outside the platform. `STRIPE_FAKE=true` (never in production) swaps in a fake client for tests and demos.
- **D32.** Emails and jobs (launch): every email goes through `MailService.sendLogged` with a unique key stored in `EmailLog`, so cron jobs and restarts never send twice. Jobs run inside the API with `@nestjs/schedule` in Europe/Tirane (`CRON_ENABLED=false` in tests, which call the services with a fixed `now`). Reminders go only to students with a confirmed payment for that month; the offline-learning email goes only on days without a lecture, on the group's configured days (Sundays off), to students who haven't opted out. The timetable email carries an `.ics` built in-house (no library).
- **D33.** Offline lessons (launch): Markdown rendered with react-markdown without raw HTML (no XSS), YouTube (privacy-enhanced) and Vimeo embeds allowed by the CSP's `frame-src`, completion per student, and a "continue where you left off" card.
- **D28.** Deployment (product owner, replaces D20): one Hetzner Cloud server (CX23: Ubuntu 24.04, 2 vCPU / 4 GB, Helsinki; a Hetzner firewall allows only 22/80/443 and ICMP; first planned as a DigitalOcean Droplet). Separate images per app (`apps/web/Dockerfile`, `apps/api/Dockerfile`, `turbo prune`), built by `.github/workflows/deploy.yml` after CI passes on `main`, pushed to GHCR tagged with the git SHA, and deployed over SSH by `deploy/scripts/deploy.sh`, which migrates (`prisma migrate deploy` from the api image), health-checks through Caddy and rolls back to the previous tag on failure. Postgres is on an internal-only Docker network. A backup container dumps the database nightly at 02:30 Europe/Tirane to the private R2 bucket `avenir-backups` (14 daily + 8 weekly). Email goes through Resend's SMTP (D21, no code change). The first admin comes from `node dist/src/cli/seed-admin.js` with `ADMIN_*` variables. Runbook: docs/DEPLOY.md. Launched on 2026-10-15 in **temporary mode** (`STRIPE_ENABLED=false`, `STORAGE_DRIVER=local` on a Docker volume, `MAIL_TRANSPORT=console`; DEPLOY.md 6a) until the Stripe, R2 and Resend accounts exist.
