/**
 * Turning one submission into a spreadsheet row. Pure — no Google dependency,
 * independently testable, and reusable if the destination ever changes.
 *
 * Column order tracks `IntakeFormField.sortOrder`, so reordering fields in
 * the admin panel reorders the sheet's columns too — the admin UI says so.
 */
import type { IntakeFormField, IntakeSubmission } from "@/generated/prisma/client";

type NameLike = { firstName?: string; middleName?: string; lastName?: string };
type AddressLike = {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

function formatAnswer(kind: IntakeFormField["kind"], value: unknown): string {
  if (value === null || value === undefined) return "";

  switch (kind) {
    case "NAME": {
      const v = value as NameLike;
      return [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ");
    }
    case "ADDRESS": {
      const v = value as AddressLike;
      return [v.street, v.street2, v.city, v.state, v.zip].filter(Boolean).join(", ");
    }
    case "CHECKBOX_GROUP":
      return Array.isArray(value) ? value.join(", ") : String(value);
    default:
      return String(value);
  }
}

const answerColumns = (fields: IntakeFormField[]) =>
  fields.filter((field) => field.kind !== "INFO").sort((a, b) => a.sortOrder - b.sortOrder);

export function buildSheetHeaderRow(fields: IntakeFormField[]): string[] {
  return ["Submitted at", ...answerColumns(fields).map((field) => field.label)];
}

export function buildSheetRow(
  submission: Pick<IntakeSubmission, "data" | "signatureUrl" | "createdAt">,
  fields: IntakeFormField[],
): string[] {
  const data = (submission.data ?? {}) as Record<string, unknown>;

  return [
    submission.createdAt.toISOString(),
    ...answerColumns(fields).map((field) =>
      field.kind === "SIGNATURE"
        ? (data._signatureFieldKey ? data._signatureFieldKey === field.fieldKey : !field.isCustom) ? submission.signatureUrl : ""
        : formatAnswer(field.kind, data[field.fieldKey]),
    ),
  ];
}
