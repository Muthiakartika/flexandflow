/**
 * The wire contract for the intake form: what the public page reads and what
 * it posts. Plain JSON, safe to import from client components — no Prisma
 * types, no Date.
 */
import type { IntakeFieldKind, IntakeSectionKey } from "@/generated/prisma/enums";

export type { IntakeFieldKind, IntakeSectionKey };

/** One field, trimmed to what the public form needs to render it. */
export type PublicIntakeField = {
  id: string;
  sectionKey: IntakeSectionKey;
  sortOrder: number;
  fieldKey: string;
  kind: IntakeFieldKind;
  label: string;
  helpText: string | null;
  required: boolean;
  /** DROPDOWN, RADIO and CHECKBOX_GROUP only; empty for every other kind. */
  options: string[];
};

/**
 * IMAGE upload constraints — one definition, read by the client field
 * (`components/intake/ImageField.tsx`, so a bad file never leaves the
 * browser) and the server (`app/api/intake/route.ts`, which is what actually
 * decides; the client check is a courtesy, not the boundary).
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Per-image limit, leaving room for the signature and other answers. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
/** Leave multipart overhead below Vercel's 4.5 MB request limit. */
export const MAX_INTAKE_PAYLOAD_BYTES = 4 * 1024 * 1024;

export function intakePayloadBytes(form: FormData): number {
  let size = 0;
  for (const [key, value] of form) {
    size += new Blob([key]).size + 256;
    size += typeof value === "string" ? new Blob([value]).size : value.size + new Blob([value.name]).size;
  }
  return size;
}

/** Uniform error body for the intake API — a narrower parallel to booking's
 *  `ApiError`, which carries slot-related codes that make no sense here. */
export type ApiError = {
  error: string;
  code: "VALIDATION" | "RATE_LIMITED" | "SPAM_REJECTED" | "SERVER";
  fields?: Record<string, string>;
};

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiError).error === "string" &&
    typeof (value as ApiError).code === "string"
  );
}
