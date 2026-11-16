-- PLAN D38: a short summary under each job, cleaner pay, stricter Kosovo rule, starter career pages.

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "summary" TEXT;

-- Jobs published under the old contractor rule although a job board listed the countries
-- applicants must live in (e.g. only India, only the United States). The next run re-checks
-- every job it sees again with the new rules.
UPDATE "Job"
SET "status" = 'REJECTED', "rule" = 'not_eligible:countries'
WHERE "status" = 'OPEN'
  AND "rule" = 'eligible:contractor'
  AND "applySource" IN ('HIMALAYAS', 'JOBICY')
  AND COALESCE("locationText", '') <> '';

-- Pay read as yearly when it was hourly ("$6–$7 a year"): hidden until the next run reads it again.
UPDATE "Job"
SET "salaryMin" = NULL, "salaryMax" = NULL, "salaryCurrency" = NULL, "salaryPeriod" = NULL
WHERE "salaryPeriod" = 'YEAR' AND COALESCE("salaryMax", "salaryMin") < 5000;

-- Career pages of remote-first companies that hire across Europe or worldwide. Every job still
-- goes through the rules; a board that keeps failing is switched off after 5 runs, and admins
-- can add or remove companies at /training/admin/jobs.
INSERT INTO "JobCompany" ("id", "key", "name", "ats", "boardToken", "status", "discoveredFrom", "failCount", "createdAt")
VALUES
  (gen_random_uuid()::text, 'gitlab', 'GitLab', 'GREENHOUSE', 'gitlab', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'canonical', 'Canonical', 'GREENHOUSE', 'canonical', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'mozilla', 'Mozilla', 'GREENHOUSE', 'mozilla', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'grafana labs', 'Grafana Labs', 'GREENHOUSE', 'grafanalabs', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'elastic', 'Elastic', 'GREENHOUSE', 'elastic', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'wikimedia foundation', 'Wikimedia Foundation', 'GREENHOUSE', 'wikimedia', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'remote com', 'Remote.com', 'GREENHOUSE', 'remotecom', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'posthog', 'PostHog', 'ASHBY', 'posthog', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'supabase', 'Supabase', 'ASHBY', 'supabase', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'zapier', 'Zapier', 'ASHBY', 'zapier', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'n8n', 'n8n', 'ASHBY', 'n8n', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'duckduckgo', 'DuckDuckGo', 'ASHBY', 'duck-duck-go', 'ACTIVE', 'seed', 0, now()),
  (gen_random_uuid()::text, 'linear', 'Linear', 'ASHBY', 'linear', 'ACTIVE', 'seed', 0, now())
ON CONFLICT DO NOTHING;
