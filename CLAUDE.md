# AI Academy: guide for Claude

AI Academy is an LMS for live, cohort-based courses on AI and digital marketing. Classes run on Google Meet; we only store the link. The full spec, roadmap and decisions log are in `docs/PLAN.md`; read it before starting a sprint.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo, TypeScript 6 (strict) everywhere, ESLint 10 (flat config) + Prettier.
- **apps/web:** Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TanStack Query 5, react-hook-form + zod 4.
- **apps/api:** NestJS 12 (ESM), Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL 16, Passport JWT, bcrypt, class-validator. Global prefix `/api/v1`, Swagger at `/api/docs`.
- **packages/shared** (`@ai-academy/shared`): enums, zod schemas, and API response types shared by web and api. It compiles to `dist/`.
- **Tests:** Vitest for API unit and e2e tests (not Jest; see PLAN D1). Playwright for web, from Sprint 4.

## Commands (run from the repo root)

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `pnpm install`    | Install everything (also generates the Prisma client)          |
| `pnpm db:up`      | Start Postgres (docker compose), waiting until it is healthy   |
| `pnpm db:migrate` | `prisma migrate dev` (creates or applies migrations)           |
| `pnpm db:seed`    | Seed users, both tracks, a sample session and a sample test    |
| `pnpm db:reset`   | Drop the database, re-run all migrations, re-seed              |
| `pnpm dev`        | Run web (:3000), api (:4000), and the shared package watcher   |
| `pnpm build`      | Build all packages                                             |
| `pnpm lint`       | ESLint in every package                                        |
| `pnpm type-check` | `tsc --noEmit` in every package                                |
| `pnpm test`       | Unit tests (Vitest)                                            |
| `pnpm test:e2e`   | API e2e tests (needs Postgres running; uses `ai_academy_test`) |
| `pnpm format`     | Prettier write                                                 |

To run a single package, use `pnpm --filter @ai-academy/api <script>` (or `@ai-academy/web`, `@ai-academy/shared`).

Seed logins (all use the password `Password123!`): `admin@aiacademy.dev`, `instructor@aiacademy.dev`, `student1@aiacademy.dev`, `student2@aiacademy.dev`.

## Folder map

```
apps/api/
  prisma/              schema.prisma, migrations/, seed.ts
  prisma.config.ts     Prisma 7 config (schema path, seed command, datasource URL)
  src/main.ts          bootstrap (prefix, validation pipe, cookies, swagger)
  src/setup-app.ts     app-wide config shared by main.ts and the e2e tests
  src/generated/       Prisma client (generated, gitignored)
  src/common/          decorators (@Public, @Roles, @CurrentUser), guards, filters
  src/config/          env validation
  src/prisma/          PrismaService (global)
  src/mail/            MailService (console transport in dev)
  src/modules/         auth, users, courses, enrollments, ... (one Nest module per folder)
  test/                e2e tests (*.e2e-spec.ts)
apps/web/
  src/app/(public)/    home, catalog, course detail, auth pages (header + footer layout)
  src/app/(app)/       dashboard, profile, admin/* (sidebar layout, client-side guarded)
  src/components/ui/   shadcn/ui primitives (generated; edit sparingly)
  src/components/      app components (layout, course, status badge, ...)
  src/lib/             api client, auth context, query client, utils
  src/proxy.ts         redirects to /login when there is no session cookie (UX only; the API enforces auth)
packages/shared/src/   enums.ts, schemas/*.ts (zod), types.ts (API DTO shapes)
docs/PLAN.md           spec, roadmap, decisions
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
  - Instructors may touch only modules where `module.instructorId === user.id`. Check this in the service.
- **Tokens:**
  - The access token is a 15-minute JWT returned in the response body; the web app keeps it in memory.
  - The refresh token is a 7-day JWT in the httpOnly `aa_refresh` cookie (path `/`).
  - Refresh and reset tokens are signed with the secret plus a fingerprint of the password hash (PLAN D2).
- **Errors:** throw Nest HTTP exceptions with a clear message. Prisma `P2002` maps to 409, `P2025` to 404, and `P2003` to 409 (global filter).
- **Times:** store UTC and render in the viewer's local time with `<LocalDateTime>` (a client component).
- **Web data:**
  - Public pages are server components that fetch the API directly (`API_INTERNAL_URL`).
  - Authenticated pages use TanStack Query through `apiFetch` (`src/lib/api.ts`), which attaches the access token and retries once after `/auth/refresh`.
- **UI:**
  - Components stay small. Use shadcn primitives and Tailwind only, with no custom CSS beyond theme tokens in `globals.css`.
  - Primary colour is indigo-600; neutrals are slate. Cards use `rounded-xl` (12px), spacing follows the 8px grid, content uses `max-w-[1200px]`, and every page must work at 375px.
  - Show module status everywhere with `<ModuleStatusBadge>` (green PASSED, amber ACTIVE, slate LOCKED + lock icon, red FAILED).
- **Business rules that must hold (see PLAN §2):**
  - Grading runs only on the server, and `isCorrect` never reaches students.
  - A passed attempt sets the module to PASSED and the next module (order + 1) to ACTIVE in one `$transaction`.
  - Approving an enrollment creates every ModuleProgress row: module 1 ACTIVE, the rest LOCKED.
  - Test defaults: 70% pass mark, 45 minutes, 2 attempts, window in the last week of the module.
- **Don't** add paid services or change `schema.prisma` without asking the product owner. Don't leave TODO stubs in shipped scope.
- **Commits:** small, imperative subject lines, one milestone per commit.
