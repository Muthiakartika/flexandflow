/**
 * The two Gmail addresses SUPER_ADMIN gives share access to the intake
 * Sheet. A singleton row — see the model comment in `schema.prisma`.
 */
import "server-only";

import { prisma } from "@/lib/db";

const SETTINGS_ID = "singleton";

export type IntakeSettingsRow = {
  shareEmail1: string | null;
  shareEmail2: string | null;
};

export async function loadIntakeSettings(): Promise<IntakeSettingsRow> {
  const row = await prisma.intakeSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  return {
    shareEmail1: row?.shareEmail1 ?? null,
    shareEmail2: row?.shareEmail2 ?? null,
  };
}

export async function upsertIntakeSettings(input: {
  shareEmail1: string | null;
  shareEmail2: string | null;
  updatedById: string;
}): Promise<void> {
  await prisma.intakeSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      shareEmail1: input.shareEmail1,
      shareEmail2: input.shareEmail2,
      updatedById: input.updatedById,
    },
    create: {
      id: SETTINGS_ID,
      shareEmail1: input.shareEmail1,
      shareEmail2: input.shareEmail2,
      updatedById: input.updatedById,
    },
  });
}
