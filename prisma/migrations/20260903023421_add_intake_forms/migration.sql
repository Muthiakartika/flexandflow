-- CreateEnum
CREATE TYPE "IntakeSectionKey" AS ENUM ('CLIENT_DETAILS', 'APPOINTMENT_HISTORY', 'HEALTH_SCREENING', 'LYMPHATIC_SCREENING', 'CONSENT');

-- CreateEnum
CREATE TYPE "IntakeFieldKind" AS ENUM ('TEXT', 'NAME', 'ADDRESS', 'DATE', 'DROPDOWN', 'YES_NO', 'CHECKBOX_GROUP', 'TEXTAREA', 'SIGNATURE', 'INFO');

-- CreateEnum
CREATE TYPE "IntakeNotificationKind" AS ENUM ('ADMIN_NEW_SUBMISSION');

-- CreateTable
CREATE TABLE "IntakeFormField" (
    "id" TEXT NOT NULL,
    "sectionKey" "IntakeSectionKey" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fieldKey" TEXT NOT NULL,
    "kind" "IntakeFieldKind" NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSubmission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "signatureUrl" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientWhatsapp" TEXT NOT NULL,
    "ipAddress" TEXT,
    "sheetSyncedAt" TIMESTAMP(3),
    "sheetSyncAttempts" INTEGER NOT NULL DEFAULT 0,
    "sheetSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeNotificationJob" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "kind" "IntakeNotificationKind" NOT NULL,
    "target" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeNotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "shareEmail1" TEXT,
    "shareEmail2" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeFormField_fieldKey_key" ON "IntakeFormField"("fieldKey");

-- CreateIndex
CREATE INDEX "IntakeFormField_sectionKey_sortOrder_idx" ON "IntakeFormField"("sectionKey", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSubmission_reference_key" ON "IntakeSubmission"("reference");

-- CreateIndex
CREATE INDEX "IntakeSubmission_createdAt_idx" ON "IntakeSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "IntakeSubmission_clientWhatsapp_idx" ON "IntakeSubmission"("clientWhatsapp");

-- CreateIndex
CREATE INDEX "IntakeNotificationJob_status_scheduledAt_idx" ON "IntakeNotificationJob"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeNotificationJob_submissionId_channel_kind_target_key" ON "IntakeNotificationJob"("submissionId", "channel", "kind", "target");

-- AddForeignKey
ALTER TABLE "IntakeNotificationJob" ADD CONSTRAINT "IntakeNotificationJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IntakeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
