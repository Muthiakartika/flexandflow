/**
 * Getting one submission into the Sheet, and retrying whatever has not made
 * it yet.
 */
import "server-only";

import { prisma } from "@/lib/db";
import { sheetsEnabled } from "@/lib/env";
import { appendIntakeRow } from "@/lib/intake/sheets";
import { buildSheetHeaderRow, buildSheetRow } from "@/lib/intake/sheet-row";

const MAX_SHEET_SYNC_ATTEMPTS = 5;
const NOT_CONFIGURED_MESSAGE = "Google Sheets is not configured yet.";

/**
 * Returns whether the submission ended up synced (already was, or just was).
 *
 * When Sheets is simply unconfigured, this does **not** spend the retry
 * budget: `sheetSyncAttempts` only increments on a real, configured attempt
 * that failed. That is what lets the studio add credentials weeks later and
 * have the very next cron tick pick up every historical submission with a
 * full retry budget still available, rather than finding them all DEAD.
 */
export async function syncSubmissionToSheet(submissionId: string): Promise<boolean> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) return false;
  if (submission.sheetSyncedAt) return true;

  if (!sheetsEnabled()) {
    if (submission.sheetSyncError !== NOT_CONFIGURED_MESSAGE) {
      await prisma.intakeSubmission.update({
        where: { id: submissionId },
        data: { sheetSyncError: NOT_CONFIGURED_MESSAGE },
      });
    }
    return false;
  }

  const fields = await prisma.intakeFormField.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const row = buildSheetRow(submission, fields);
  const result = await appendIntakeRow(row, buildSheetHeaderRow(fields));

  if (result.ok) {
    await prisma.intakeSubmission.update({
      where: { id: submissionId },
      data: { sheetSyncedAt: new Date(), sheetSyncError: null },
    });
    return true;
  }

  await prisma.intakeSubmission.update({
    where: { id: submissionId },
    data: {
      sheetSyncAttempts: { increment: 1 },
      sheetSyncError: result.error.slice(0, 400),
    },
  });
  return false;
}

/** The cron path: whatever has not synced yet and still has budget left. */
export async function retryPendingSheetSyncs(
  limit = 25,
): Promise<{ attempted: number; synced: number }> {
  const pending = await prisma.intakeSubmission.findMany({
    where: {
      sheetSyncedAt: null,
      sheetSyncAttempts: { lt: MAX_SHEET_SYNC_ATTEMPTS },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let synced = 0;
  for (const row of pending) {
    if (await syncSubmissionToSheet(row.id)) synced += 1;
  }

  return { attempted: pending.length, synced };
}
