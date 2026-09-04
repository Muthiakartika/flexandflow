/**
 * Writing one completed form. One insert — there is no multi-step commit like
 * booking's, because nothing here holds a slot another submission could
 * contest.
 */
import "server-only";

import { prisma } from "@/lib/db";
import { CORE_FIELD_KEYS, type NameAnswer } from "@/lib/intake/schema";
import { createIntakeReference } from "@/lib/intake/reference";

function isNameAnswer(value: unknown): value is NameAnswer {
  return typeof value === "object" && value !== null && "firstName" in value;
}

function clientNameOf(answers: Record<string, unknown>): string {
  const value = answers[CORE_FIELD_KEYS.fullName];
  if (!isNameAnswer(value)) return "—";

  const name = [value.firstName, value.lastName].filter(Boolean).join(" ").trim();
  return name || "—";
}

export async function createIntakeSubmission(input: {
  answers: Record<string, unknown>;
  signatureUrl: string;
  ipAddress: string | null;
}): Promise<{ id: string; reference: string }> {
  const created = await prisma.intakeSubmission.create({
    data: {
      reference: createIntakeReference(),
      /* Matches lib/cms/write.ts's own cast for the same situation: a plain
         object of Zod-validated primitives/arrays into a Prisma Json field,
         which Prisma's InputJsonValue does not accept as Record<string,
         unknown> without one. */
      data: input.answers as never,
      signatureUrl: input.signatureUrl,
      clientName: clientNameOf(input.answers),
      clientEmail: (input.answers[CORE_FIELD_KEYS.email] as string) || null,
      clientWhatsapp: (input.answers[CORE_FIELD_KEYS.whatsapp] as string) || "",
      ipAddress: input.ipAddress,
    },
  });

  return { id: created.id, reference: created.reference };
}
