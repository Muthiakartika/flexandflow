-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntakeFieldKind" ADD VALUE 'RADIO';
ALTER TYPE "IntakeFieldKind" ADD VALUE 'PHONE';
ALTER TYPE "IntakeFieldKind" ADD VALUE 'IMAGE';

-- AlterTable
ALTER TABLE "IntakeFormField" ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false;
