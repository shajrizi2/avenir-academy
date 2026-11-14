-- CreateEnum
CREATE TYPE "JobSourceKind" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKABLE', 'REMOTEOK', 'JOBICY', 'HIMALAYAS');

-- CreateEnum
CREATE TYPE "JobCompanyStatus" AS ENUM ('ACTIVE', 'DISABLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM ('ENGINEERING', 'AI_DATA', 'MARKETING', 'DESIGN', 'PRODUCT', 'SALES', 'SUPPORT', 'WRITING', 'FINANCE_ADMIN', 'HR', 'OTHER');

-- CreateEnum
CREATE TYPE "JobContract" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobRegion" AS ENUM ('WORLDWIDE', 'EUROPE', 'BALKANS', 'CONTRACT_ANYWHERE', 'GLOBAL_EMPLOYER');

-- CreateEnum
CREATE TYPE "JobCloseReason" AS ENUM ('MISSING_FROM_SOURCE', 'DEAD_LINK', 'TOO_OLD', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobBlockKind" AS ENUM ('COMPANY', 'DOMAIN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailType" ADD VALUE 'JOB_LOGIN_CODE';
ALTER TYPE "EmailType" ADD VALUE 'JOBS_ALERT';
ALTER TYPE "EmailType" ADD VALUE 'CAMPAIGN';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "jobBoardPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "JobCompany" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ats" "JobSourceKind",
    "boardToken" TEXT,
    "website" TEXT,
    "status" "JobCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "discoveredFrom" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFeed" (
    "kind" "JobSourceKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "pausedUntil" TIMESTAMP(3),

    CONSTRAINT "JobFeed_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "category" "JobCategory" NOT NULL,
    "contract" "JobContract" NOT NULL DEFAULT 'UNKNOWN',
    "region" "JobRegion" NOT NULL,
    "locationText" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "salaryPeriod" TEXT,
    "applyUrl" TEXT NOT NULL,
    "applySource" "JobSourceKind" NOT NULL,
    "status" "JobStatus" NOT NULL,
    "rule" TEXT NOT NULL,
    "scamScore" INTEGER NOT NULL DEFAULT 0,
    "scamReasons" TEXT[],
    "postedAt" TIMESTAMP(3) NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkCheckedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" "JobCloseReason",

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" "JobSourceKind" NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "missedRuns" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeeker" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSeeker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSeekerCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerSession" (
    "id" TEXT NOT NULL,
    "jobSeekerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSeekerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBlock" (
    "id" TEXT NOT NULL,
    "kind" "JobBlockKind" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "stats" JSONB,
    "errors" JSONB,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaignRecipient" (
    "campaignId" TEXT NOT NULL,
    "jobSeekerId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("campaignId","jobSeekerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobCompany_key_key" ON "JobCompany"("key");

-- CreateIndex
CREATE INDEX "JobCompany_status_ats_idx" ON "JobCompany"("status", "ats");

-- CreateIndex
CREATE UNIQUE INDEX "JobCompany_ats_boardToken_key" ON "JobCompany"("ats", "boardToken");

-- CreateIndex
CREATE INDEX "Job_status_postedAt_idx" ON "Job"("status", "postedAt");

-- CreateIndex
CREATE INDEX "Job_status_category_postedAt_idx" ON "Job"("status", "category", "postedAt");

-- CreateIndex
CREATE INDEX "Job_fingerprint_idx" ON "Job"("fingerprint");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "JobListing_jobId_idx" ON "JobListing"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_source_externalId_key" ON "JobListing"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeeker_email_key" ON "JobSeeker"("email");

-- CreateIndex
CREATE INDEX "JobSeeker_lastSeenAt_idx" ON "JobSeeker"("lastSeenAt");

-- CreateIndex
CREATE INDEX "JobSeekerCode_email_createdAt_idx" ON "JobSeekerCode"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerSession_tokenHash_key" ON "JobSeekerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "JobSeekerSession_jobSeekerId_idx" ON "JobSeekerSession"("jobSeekerId");

-- CreateIndex
CREATE UNIQUE INDEX "JobBlock_kind_value_key" ON "JobBlock"("kind", "value");

-- CreateIndex
CREATE INDEX "JobRun_startedAt_idx" ON "JobRun"("startedAt");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "JobCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerSession" ADD CONSTRAINT "JobSeekerSession_jobSeekerId_fkey" FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex

-- CreateIndex
CREATE INDEX "EmailCampaign_status_idx" ON "EmailCampaign"("status");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_campaignId_sentAt_idx" ON "EmailCampaignRecipient"("campaignId", "sentAt");

-- AddForeignKey
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_jobSeekerId_fkey" FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
