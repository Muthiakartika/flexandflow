/**
 * What the intake admin screens read.
 *
 * Separate from `lib/intake/read.ts` for the same reason the CMS splits
 * `read.ts` from `admin.ts`: that one serves the public form and is cached;
 * this one serves the panel, is never cached, and returns the full row
 * (`updatedById`, timestamps) the editor needs but the public form does not.
 */
import "server-only";

import type { IntakeFormField, IntakeSubmission } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Every field, in the same reading order the public form uses — grouped by
 *  section in memory by the page component, not here (see `SECTION_ORDER`). */
export async function listIntakeFieldsForAdmin(): Promise<IntakeFormField[]> {
  return prisma.intakeFormField.findMany({ orderBy: { sortOrder: "asc" } });
}

export type IntakeSubmissionRow = Pick<
  IntakeSubmission,
  | "id"
  | "reference"
  | "clientName"
  | "clientEmail"
  | "clientWhatsapp"
  | "createdAt"
  | "sheetSyncedAt"
  | "sheetSyncError"
>;

/** Newest first — what the admin panel is most likely to be checking. */
export async function listIntakeSubmissions(
  limit = 100,
): Promise<IntakeSubmissionRow[]> {
  return prisma.intakeSubmission.findMany({
    select: {
      id: true,
      reference: true,
      clientName: true,
      clientEmail: true,
      clientWhatsapp: true,
      createdAt: true,
      sheetSyncedAt: true,
      sheetSyncError: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getIntakeSubmission(
  id: string,
): Promise<IntakeSubmission | null> {
  return prisma.intakeSubmission.findUnique({ where: { id } });
}

export async function intakeSubmissionCount(): Promise<number> {
  return prisma.intakeSubmission.count();
}
