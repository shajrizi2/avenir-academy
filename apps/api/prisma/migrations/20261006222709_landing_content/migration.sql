-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('sq', 'en');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "quote" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "locale" "Locale" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextCohortStart" TIMESTAMP(3),
    "scheduleSq" TEXT,
    "scheduleEn" TEXT,
    "seatsTotal" INTEGER,
    "priceAmount" INTEGER,
    "priceCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "priceNoteSq" TEXT,
    "priceNoteEn" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "whatsappNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Testimonial_locale_isPublished_idx" ON "Testimonial"("locale", "isPublished");
