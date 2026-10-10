-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "descriptionSq" TEXT,
ADD COLUMN     "summarySq" TEXT,
ADD COLUMN     "titleSq" TEXT;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "descriptionSq" TEXT,
ADD COLUMN     "titleSq" TEXT;
