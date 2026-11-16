-- PLAN D40: stricter Kosovo rules with evidence, and the admins' verdict on each company.

-- AlterEnum
ALTER TYPE "JobRegion" ADD VALUE 'KOSOVO' BEFORE 'WORLDWIDE';

-- AlterTable
ALTER TABLE "JobCompany" ADD COLUMN "hiresInKosovo" BOOLEAN;

-- Every published job waits for the new rules: the next run re-checks each job it sees again
-- and publishes only those that pass. Jobs no source lists any more stay hidden.
UPDATE "Job" SET "status" = 'REJECTED', "rule" = 'recheck:d40' WHERE "status" = 'OPEN';
