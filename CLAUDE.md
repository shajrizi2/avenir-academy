# AI Academy: guide for Claude

Avenir Academy (package scope `@ai-academy/*`) is an LMS for live, cohort-based courses on AI, coding, digital marketing and SEO, sold at €89 a month in groups of at most 10. Classes run on Google Meet; we only store the link. The platform is **Albanian only**. The full spec, roadmap and decisions log are in `docs/PLAN.md`; read it before starting a sprint.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo, TypeScript 6 (strict) everywhere, ESLint 10 (flat config) + Prettier.
- **apps/web:** Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TanStack Query 5, react-hook-form + zod 4.
- **apps/api:** NestJS 12 (ESM), Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL 16, Passport JWT, bcrypt, class-validator. Global prefix `/api/v1`, Swagger at `/api/docs`.
- **packages/shared** (`@ai-academy/shared`): enums, zod schemas, and API response types shared by web and api. It compiles to `dist/`.
- **Tests:** Vitest for unit tests (api, web, shared) and API e2e (not Jest; see PLAN D1). Playwright for web e2e (`apps/web/e2e`, runs on the system Chrome).
- **i18n:** Albanian only (PLAN D29). Every string of the web app comes from `apps/web/messages/sq.json` through `import { t, fmt, plural } from '@/i18n/messages'`; API messages and emails are Albanian in the code. `/en/...` redirects to `/sq/...`; `messages/en.json` stays for later and is never imported by the app. No i18n library (PLAN D8).
- **Payments:** Stripe Checkout (card) and bank transfer behind `PaymentProvider` (`apps/api/src/modules/payments/`). Scheduled emails run inside the API with `@nestjs/schedule`.

## Commands (run from the repo root)

| Command           | What it does                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm install`    | Install everything (also generates the Prisma client)                                                 |
| `pnpm bootstrap`  | First-time setup: env files, Postgres, migrations, seed                                               |
| `pnpm db:up`      | Start Postgres (docker compose), waiting until it is healthy                                          |
| `pnpm db:migrate` | `prisma migrate dev` + `prisma generate`                                                              |
| `pnpm db:seed`    | Seed users, the three courses, one group each (48 lectures), lessons, payments and a test             |
| `pnpm db:reset`   | Drop the database, re-run all migrations, re-seed                                                     |
| `pnpm dev`        | Run web (:3000), api (:4000), and the shared package watcher                                          |
| `pnpm build`      | Build all packages                                                                                    |
| `pnpm lint`       | ESLint in every package                                                                               |
| `pnpm type-check` | `tsc --noEmit` in every package                                                                       |
| `pnpm test`       | Unit tests (Vitest)                                                                                   |
| `pnpm test:e2e`   | API e2e (`ai_academy_test`) + Playwright (`ai_academy_e2e`, run `pnpm build` first; stop the dev API) |
| `pnpm format`     | Prettier write                                                                                        |

To run a single package, use `pnpm --filter @ai-academy/api <script>` (or `@ai-academy/web`, `@ai-academy/shared`).

Seed logins (all use the password `Password123!`): `admin@aiacademy.dev`, `instructor@aiacademy.dev`, `student1@aiacademy.dev` (enrolled and paid in Vibe Coding), `student2@aiacademy.dev` (a bank transfer waiting for the admin). Production content comes from `node dist/src/cli/seed-courses.js` (courses + groups, no people).

Without Stripe keys, card checkout answers 503 and bank transfer works; `STRIPE_FAKE=true` in `apps/api/.env` gives a fake Stripe (no network) whose checkout lands on the success page, and a signed webhook can be posted by hand (see `apps/api/test/support.ts`).

## Folder map

```
apps/api/
  prisma/              schema.prisma, migrations/, seed.ts, catalog.ts (the three courses)
  prisma.config.ts     Prisma 7 config (schema path, seed command, datasource URL)
  src/main.ts          bootstrap (prefix, validation pipe, cookies, swagger)
  src/setup-app.ts     app-wide config shared by main.ts and the e2e tests
  src/generated/       Prisma client (generated, gitignored)
  src/common/          decorators (@Public, @Roles, @CurrentUser), guards, filters
  src/config/          env validation
  src/prisma/          PrismaService (global)
  src/cli/             seed-admin.ts, seed-courses.ts (production seeds)
  src/common/i18n/     Albanian messages for class-validator errors
  src/mail/            MailService (console transport in dev; sendLogged = idempotent), templates.ts (every email), ics.ts
  src/modules/groups, payments, lessons, notifications (cron jobs + email log)
  src/modules/         auth, users, courses, enrollments, ... (one Nest module per folder)
  test/                e2e tests (*.e2e-spec.ts)
apps/web/
  messages/sq.json     landing copy (Albanian, source of truth); en.json mirrors its keys
  e2e/                 Playwright tests
  src/app/[locale]/    ROOT LAYOUT #1: marketing landing page /sq (+ opengraph-image)
  src/app/(site)/      ROOT LAYOUT #2 (lang="sq"): everything else
    (public)/          catalog, course detail (groups + seats), auth pages (header + footer layout)
    (app)/             dashboard, checkout/*, payments/*, learn/* (incl. lessons), teach/*, admin/* (sidebar, client-side guarded)
  src/app/global-not-found.tsx, sitemap.ts, robots.ts
  src/components/landing/  one component per landing section + header/footer/CTA helpers
  src/i18n/            messages.ts (t, fmt, plural), server.ts (landing), no-english.test.ts (flags English JSX)
  src/components/ui/   shadcn/ui primitives (generated; edit sparingly)
  src/components/      app components (layout, course, status badge, ...)
  src/lib/             api client, auth context, queries, landing-data (fail-soft loaders), analytics track()
  src/proxy.ts         "/" → /sq or /en (aa_locale cookie); /login redirect without a session cookie (UX only)
packages/shared/src/   enums.ts, schemas/*.ts (zod), types.ts (API DTO shapes)
scripts/bootstrap.mjs  first-run local setup
docs/PLAN.md           spec, roadmap, decisions
docs/DEPLOY.md         production runbook (Droplet, DNS, R2, Resend, CI/CD, backups, day-2 operations)
deploy/                docker-compose.prod.yml, Caddyfile, backup/ container, scripts/ (setup, deploy, ship, rollback, restore)
apps/*/Dockerfile      one image per app (build from the repo root); .github/workflows/deploy.yml pushes them to GHCR
```

## Conventions

- **ESM everywhere.** Relative imports in the api and shared packages need a `.js` extension (`nodenext`). The web app uses the `@/` alias.
- **Input validation:**
  - API: every request body and query goes through a class-validator DTO. The global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted` + `transform`.
  - Web: every form uses a zod schema from `@ai-academy/shared`.
  - Keep the DTO limits (lengths, etc.) in sync with the shared zod schemas. Shared constants live in `packages/shared/src/constants.ts`.
- **Never return `passwordHash`.** Read users through `publicUserSelect` (`src/modules/users/user.select.ts`), never a bare `findUnique` that returns the whole row to a client.
- **Auth:**
  - Every route requires a JWT by default (global `JwtAuthGuard`). Mark public routes with `@Public()` and restrict them with `@Roles(Role.ADMIN, ...)`.
  - Instructors may touch only modules where `module.instructorId === user.id`. Check this in the service with `ModuleAccessService` (`src/modules/course-modules/module-access.service.ts`): `assertStaff()` for writes, `assertCanView()` for reads (students need an APPROVED enrollment and a module that isn't LOCKED).
- **Tokens:**
  - The access token is a 15-minute JWT returned in the response body; the web app keeps it in memory.
  - The refresh token is a 7-day JWT in the httpOnly `aa_refresh` cookie (path `/`).
  - Refresh and reset tokens are signed with the secret plus a fingerprint of the password hash (PLAN D2).
- **Uploads:** materials go through `StorageService`: local disk (`STORAGE_DRIVER=local`, `UPLOAD_DIR`) in development and tests, a private R2 bucket (`s3`) in production (PLAN D15, D27). Never serve files statically or from public bucket URLs. Downloads go through `GET /materials/:id/download`, and the web app uses `apiDownload()` (plain links can't carry the in-memory token).
- **Errors:** throw Nest HTTP exceptions with a clear message. Prisma `P2002` maps to 409, `P2025` to 404, and `P2003` to 409 (global filter).
- **Copy:** never hard-code user-facing English (or Albanian) in components: add a key to `messages/sq.json` and use `t.<namespace>.<key>` (`fmt()` fills `{placeholders}`, `plural()` picks a form). `src/i18n/no-english.test.ts` fails on obvious English in JSX. Write natural Albanian in the ti-form.
- **Times:** store UTC and render in **Europe/Tirane** in Albanian with `<LocalDateTime value style="date|dateTime|long|longTime|time|short|shortTime">` or `formatDate()`; `formatSqDate/formatSqSchedule` from the shared package do the same anywhere. Browsers ship **no Albanian Intl data**, so the names live in `packages/shared/src/constants.ts`. Group dates are "YYYY-MM-DD" keys; format them as `${key}T12:00:00Z`.
- **Web data:**
  - Next.js 16 runs with **Cache Components**. Read `apps/web/node_modules/next/dist/docs/` before using unfamiliar APIs; they differ from older Next versions.
  - Public pages are server components that fetch the API directly (`serverGet`, `API_INTERNAL_URL`). Every uncached fetch, `params` read and `useSearchParams()` must sit inside `<Suspense>`.
  - Don't use `'use cache'` for API data; it would make `next build` call the API.
  - When catching errors around fetches in server components, call `unstable_rethrow(error)` first, so Next's own prerender signals aren't swallowed (see `lib/landing-data.ts`).
  - Don't call `new Date()` in server components.
  - `export const dynamic` is not allowed.
  - The signed-in area uses `export const instant = false` (client-gated). Every `page.tsx` under `(app)` exports it too (a server component; put client code in a component), or the dev server logs instant-navigation errors. Pages with a dynamic segment are a small server `page.tsx` that renders a client component inside `<Suspense>`, which reads the id with `useParams()`.
  - Public forms that work before sign-in (login, register, password reset) stay disabled until hydration with `useHydrated()` and use `method="post"` (PLAN D25).
  - Read the clock in client components with `useNow()` (`lib/use-now.ts`, ticks every 15 s; `useNowEverySecond()` only for visible countdowns). Never pass `() => Date.now()` to `useSyncExternalStore`: the snapshot changes on every call and React loops forever.
  - Forms use the helpers in `components/form/` (`TextField`, `TextareaField`, `SelectField`); they generate unique ids, so two forms can share a page, and they show errors for nested paths (`questions.0.text`). Dialogs use `components/ui/dialog.tsx`, and destructive actions use `<ConfirmDialog>` (`confirmVariant="chunky"` for confirmations that aren't destructive).
  - Next keeps pages you navigated away from alive but hidden (`<Activity>`), with their state. Reset local state that must not survive (see `onFinished` in `tests/attempt-runner.tsx`), and in Playwright match visible elements only (`.filter({ visible: true })`) when a hidden page may contain the same text.
  - Section titles inside cards are headings: `<CardTitle as="h2">`.
  - Authenticated pages use TanStack Query through `apiFetch` (`src/lib/api.ts`), which attaches the access token and retries once after `/auth/refresh`.
  - The browser reaches the API at `API_BASE`: `NEXT_PUBLIC_API_URL` in production (`https://api.avenir.academy/api/v1`, cross-origin, so fetches use `credentials: 'include'`), otherwise the same-origin `/api/v1` rewrite (PLAN D26).
- **Landing page (`/[locale]`):** its only goal is registrations.
  - All copy lives in `messages/{sq,en}.json` under `landing`; never hard-code strings. Read it with `const { locale, t } = await getLandingMessages()`. A unit test enforces identical keys and placeholders in both files.
  - Every CTA is a `<CtaLink cta="…">`, which calls `track('cta_click', …)` (`lib/analytics.ts`). `track()` sends to Google Analytics only after the visitor accepts the consent banner (PLAN D22); don't load any other third-party script, or the CSP in `next.config.ts` will block it.
  - Course and module names come from the API in English with optional Albanian fields; render them on the landing page through `localizeCourse(course, locale)` (`lib/localize.ts`).
  - Data (tracks, instructors, testimonials, site settings) loads through `lib/landing-data.ts` inside `<Suspense>`. Loaders fail soft, so the page renders and converts even when the API is down.
  - Cohort date, schedule, seats, price and contact details come from the `SiteSettings` row (admin `PATCH /site-settings`), never from code.
  - Never invent testimonials, statistics or instructor details. The testimonials section renders only real, published entries.
  - The hero demo (`hero-demo.tsx`) is the main "learn by doing" signal: one quiz question per topic tab, from `hero.demo` in the messages. Every question's `answer` index must match in both languages (unit-tested).
  - The proof band (`social-proof.tsx`) shows only facts that hold for every cohort (4 modules, live classes, 70% pass mark). Never learner counts.
  - Motion is CSS-only (`.reveal` scroll-driven fade-in; `.animate-pop` / `.animate-shake` on demo answers) and is disabled under `prefers-reduced-motion`. Targets: Lighthouse Performance ≥ 90, Accessibility ≥ 95, SEO 100.
- **UI (design system; review it all at `/design`, dev only):** clean, bright, playful, "learn by doing". Light mode only.
  - **Tokens only.** Every colour comes from `globals.css`. Never use Tailwind palette colours (`slate-*`, `indigo-*`, `white`, …) or hex values in components. The one exception is `opengraph-image.tsx`, because `ImageResponse` can't read CSS variables.
    - Neutrals: `bg-background` (white), `bg-soft` (#F7F6F3 warm off-white, the app's page background), `text-ink` (#141414), `text-ink-soft` (#5B5B5B secondary text), `border-line` / `border-line-strong`.
    - Primary is ink: black buttons with white text (`text-primary-foreground`).
    - Track accents: `track-ai` (violet) and `track-marketing` (orange), each with `-tint` (backgrounds), `-ink` (text and icons) and `-shadow`. The plain accent fails text contrast, so use it only for fills and decoration. Pick a course's accent with `trackTheme(slug)` from `components/course/track-theme.ts`.
    - Status: `passed` / `active` / `locked` / `failed`, each with `-tint` and `-ink`.
  - **Type:** Plus Jakarta Sans (`app/fonts.ts`). Headings are 700–800 with `tracking-heading`; body is 400–500. The scale is 14 / 16 / 18 / 24 / 32 / 44 / 64: `text-sm`, `text-base`, `text-lg`, `text-subheading`, `text-heading`, `text-title`, `text-display` (plus `text-display-sm` = 40 for the mobile hero). When you add a token class, register it in `lib/utils.ts` (`createCn`), or `cn` will drop it.
  - **Shapes:** cards use `rounded-card` (16px), buttons `rounded-button` (14px), pills `rounded-full`.
  - **Pressable:** primary actions use `<Button variant="chunky">` (black) or `variant="chunky-outline"` (white, also on dark bands). Clickable cards use `<Card variant="pressable">`. Both are built on the `pressable` utility (2px border plus a solid bottom shadow in `--press`: lifts 1px on hover, sinks 3px when pressed). Don't make static content pressable.
  - **Layout:** 8px grid; landing sections use `py-16 lg:py-28` and alternate `bg-background` / `bg-soft`; content is `max-w-[1200px]` with `px-4 sm:px-6`; every page must work at 375px with no horizontal scroll. Tap targets are at least 44px (`h-11` inputs).
  - **Illustrations:** original inline SVG components in `components/illustrations/` (flat track-colour shapes with a 2px ink outline, `aria-hidden`). Never download or copy third-party art.
  - Show a learner's module status everywhere with `<ModuleStatusBadge>` (green PASSED, amber ACTIVE, slate LOCKED + lock icon, red FAILED). Show a course's public module order with `<ModulePath>`.
- **Business rules that must hold (see PLAN §2):**
  - Grading runs only on the server, and `isCorrect` never reaches students.
  - A passed attempt sets the module to PASSED and the next module (order + 1) to ACTIVE in one `$transaction`.
  - Approving an enrollment creates every ModuleProgress row: module 1 ACTIVE, the rest LOCKED.
  - Test defaults: 70% pass mark, 45 minutes, 2 attempts, window in the last week of the module.
  - Grading lives in `src/modules/tests/grading.ts` (pure, unit-tested). Progression goes through `src/modules/progress/progression.ts`: `lockProgress()` (row lock), `passModule()` (PASSED, then `unlockIfReady()` for the next module) and `isModulePaid()`. **A module opens only when the previous one is PASSED and its month has a CONFIRMED payment**; `PaymentsService.applyConfirmed` calls `unlockIfReady` too. Attempts count only since `unlockedAt` (PLAN D17); deadlines and expiry follow D18. Never select `Option.isCorrect` in anything sent to a student.
  - **Seats:** count and take a seat only inside a transaction after `GroupsService.lockAndCountFree()` (row lock on the group). Seats taken = APPROVED enrollments + PENDING_PAYMENT holds not yet expired.
  - **Payments:** only `applyConfirmed` confirms a payment (Stripe webhook, admin confirm, manual). The success redirect proves nothing. Every outcome is idempotent (status checks, `StripeEvent` ids, email unique keys).
- **Email:** every email is an Albanian template in `src/mail/templates.ts` and goes through `MailService.sendLogged()` with a `uniqueKey` (`EmailLog` makes repeats no-ops). `send()` never throws; don't `await` it where timing could reveal whether an account exists (PLAN D21). Cron jobs live in `src/modules/notifications/scheduler.service.ts` and only call service methods that take `now`, so tests drive them directly (`CRON_ENABLED=false`).
- **Tests:** the Playwright journeys (`apps/web/e2e/`) create their own users, courses and groups through the API (`e2e/support.ts`) and simulate Stripe with a signed webhook against the fake client, so they can run in parallel; don't depend on seed users' state beyond logging in. `a11y.spec.ts` must stay at zero axe violations. API e2e suites boot through `test/support.ts` (`bootApp`, `captureMail`, `signStripeEvent`).
- **Don't** add paid services or change `schema.prisma` without asking the product owner. Don't leave TODO stubs in shipped scope.
- **Commits:** small, imperative subject lines, one milestone per commit.
