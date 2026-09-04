/**
 * Validation for the intake form, defined once and used on both sides — the
 * public form validates with these before it lets the wizard submit, and
 * `POST /api/intake/` validates with the same objects before it touches the
 * database. Safe to import from client components: Zod only, no environment,
 * no database.
 *
 * Unlike booking's fixed `customerSchema`, the answer schema here is *built*
 * from whatever fields the database currently holds — the form is
 * SUPER_ADMIN-editable, so there is no fixed shape to hard-code. Both the
 * client and the API route call `buildAnswerSchema(fields)` against the same
 * field list, loaded fresh in each case.
 */
import { z } from "zod";

import { phoneSchema } from "@/lib/booking/schema";
import { isFieldVisible } from "@/lib/intake/conditional";
import type {
  IntakeFieldKind,
  IntakeSectionKey,
  PublicIntakeField,
} from "@/lib/intake/types";

export const SECTION_LABEL: Record<IntakeSectionKey, string> = {
  CLIENT_DETAILS: "Client Details",
  APPOINTMENT_HISTORY: "Appointment & Treatment History",
  HEALTH_SCREENING: "Health Screening",
  LYMPHATIC_SCREENING: "Recent Activities & Lymphatic Screening",
  CONSENT: "Acknowledgement & Consent",
};

/** Declaration order in `schema.prisma` matches this — Postgres orders an
 *  enum column by declaration, so `orderBy: { sortOrder: "asc" }` alone
 *  already groups rows section by section in this order. Kept here too as
 *  the explicit source of truth for anything that groups in memory. */
export const SECTION_ORDER: IntakeSectionKey[] = [
  "CLIENT_DETAILS",
  "APPOINTMENT_HISTORY",
  "HEALTH_SCREENING",
  "LYMPHATIC_SCREENING",
  "CONSENT",
];

/**
 * The three answers denormalised onto `IntakeSubmission` for the admin list,
 * and what `lib/intake/guard.ts`'s targets and the WhatsApp notice read. Kept
 * as named constants rather than repeated string literals so the seed data
 * and the code that reads it back can never drift apart.
 */
export const CORE_FIELD_KEYS = {
  fullName: "fullName",
  email: "emailAddress",
  whatsapp: "whatsappNumber",
} as const;

/** Kinds whose editor shows an "Options" textarea — everything else has
 *  nothing there to fill in. */
export const OPTION_KINDS: ReadonlySet<IntakeFieldKind> = new Set([
  "DROPDOWN",
  "RADIO",
  "CHECKBOX_GROUP",
]);

// ── Compound answers ─────────────────────────────────────────────────────

/** No middle name — dropped 2026-09-03 at the owner's request, for every
 *  NAME field at once. Not a per-row option; see the model comment on
 *  `IntakeFormField` in schema.prisma. */
export type NameAnswer = { firstName: string; lastName: string };
export type AddressAnswer = {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
};

function textPart(required: boolean, max: number) {
  const base = z.string().trim().max(max);
  return required ? base.min(1, "Required") : base.optional().default("");
}

function nameAnswerSchema(required: boolean) {
  return z.object({
    firstName: textPart(required, 80),
    lastName: textPart(required, 80),
  });
}

function addressAnswerSchema(required: boolean) {
  return z.object({
    street: textPart(required, 200),
    street2: textPart(false, 200),
    city: textPart(required, 100),
    state: textPart(false, 100),
    zip: textPart(false, 20),
  });
}

function enumAnswerSchema(options: string[], required: boolean, label: string) {
  const valid = (value: string) => options.includes(value);

  if (required) {
    return z
      .string()
      .min(1, `${label} is required`)
      .refine(valid, { message: `Choose a valid option for ${label}` });
  }

  return z
    .string()
    .refine((value) => value === "" || valid(value), {
      message: `Choose a valid option for ${label}`,
    })
    .optional()
    .default("");
}

const YES_NO_OPTIONS = ["Yes", "No"];

/** The Zod type for one field's answer, derived from its live definition. */
function schemaForField(field: PublicIntakeField): z.ZodTypeAny {
  const { kind, required, label, options } = field;

  if (field.fieldKey === CORE_FIELD_KEYS.email) {
    const email = z.string().trim().pipe(z.email("Enter a valid email address").max(254));
    return required ? email : z.union([email, z.literal("")]).optional().default("");
  }

  switch (kind satisfies IntakeFieldKind) {
    case "TEXT":
      return required
        ? z.string().trim().min(1, `${label} is required`).max(500)
        : z.string().trim().max(500).optional().default("");
    case "TEXTAREA":
      return required
        ? z.string().trim().min(1, `${label} is required`).max(4000)
        : z.string().trim().max(4000).optional().default("");
    case "PHONE":
      /* `phoneSchema` itself rejects an empty string (it wants at least 5
         characters before it even tries to parse), so an optional phone
         field needs the same `z.union([…, z.literal("")])` escape hatch the
         DATE case below uses — without it, leaving an optional phone field
         blank would fail with "Enter your phone number". */
      return required
        ? phoneSchema
        : z.union([phoneSchema, z.literal("")]).optional().default("");
    case "NAME":
      return required ? nameAnswerSchema(true) : nameAnswerSchema(false).prefault({ firstName: "", lastName: "" });
    case "ADDRESS":
      return required ? addressAnswerSchema(true) : addressAnswerSchema(false).prefault({ street: "", street2: "", city: "", state: "", zip: "" });
    case "DATE": {
      const date = z.iso.date(`Enter a valid date for ${label}`);
      return required ? date : z.union([date, z.literal("")]).optional().default("");
    }
    case "DROPDOWN":
    case "RADIO":
      return enumAnswerSchema(options, required, label);
    case "YES_NO":
      return enumAnswerSchema(YES_NO_OPTIONS, required, label);
    case "CHECKBOX_GROUP": {
      const base = z.array(
        z.string().refine((value) => options.includes(value), {
          message: `Invalid option for ${label}`,
        }),
      );
      return required
        ? base.min(1, `Select at least one option for ${label}`)
        : base.optional().default([]);
    }
    case "IMAGE":
      /* By the time this schema runs, the route has already turned any
         uploaded file into a stored URL and written it into `answers` —
         this only validates that a required image actually has one. See
         `app/api/intake/route.ts`. */
      return required
        ? z.string().min(1, `${label} is required`)
        : z.string().optional().default("");
    /* SIGNATURE and INFO never appear in `data` — the route strips them
       before this is ever called on a field list. SIGNATURE has its own
       dedicated `IntakeSubmission.signatureUrl` column instead. */
    case "SIGNATURE":
    case "INFO":
      return z.never();
    default:
      return z.unknown();
  }
}

/**
 * Every answer field (excludes SIGNATURE and INFO, which are not part of
 * `data`), built fresh from whatever the database currently holds.
 */
export function buildAnswerSchema(fields: PublicIntakeField[]) {
  const activeKeys = new Set(fields.map((field) => field.fieldKey));
  return z.record(z.string(), z.unknown()).transform((answers, ctx) => {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.kind === "SIGNATURE" || field.kind === "INFO") continue;
      if (!isFieldVisible(field.fieldKey, answers, activeKeys)) continue;
      const parsed = schemaForField(field).safeParse(answers[field.fieldKey]);
      if (parsed.success) result[field.fieldKey] = parsed.data;
      else for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: [field.fieldKey, ...issue.path] });
      }
    }
    return result;
  });
}

// ── Admin edits ───────────────────────────────────────────────────────────

export const intakeFieldUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "Enter a label").max(300),
  helpText: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1)).max(50).default([]),
});

/**
 * Kinds a SUPER_ADMIN may add through the panel. ADDRESS is left out —
 * nothing seeds it any more, and a five-part compound is more than this
 * editor's one "Options" textarea can configure. SIGNATURE is allowed once:
 * `addIntakeFieldAction` refuses a second one, since `IntakeSubmission`
 * only has one `signatureUrl` column to hold it.
 */
export const CREATABLE_FIELD_KINDS: IntakeFieldKind[] = [
  "TEXT",
  "TEXTAREA",
  "PHONE",
  "DATE",
  "DROPDOWN",
  "RADIO",
  "YES_NO",
  "CHECKBOX_GROUP",
  "IMAGE",
  "SIGNATURE",
  "NAME",
  "INFO",
];

export const intakeFieldCreateSchema = z.object({
  sectionKey: z.enum(SECTION_ORDER as [IntakeSectionKey, ...IntakeSectionKey[]]),
  kind: z.enum(CREATABLE_FIELD_KINDS as [IntakeFieldKind, ...IntakeFieldKind[]]),
  label: z.string().trim().min(1, "Enter a label").max(300),
  helpText: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1)).max(50).default([]),
});

const optionalEmail = z
  .union([z.email("That email address does not look right"), z.literal("")])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null);

export const intakeSettingsSchema = z.object({
  shareEmail1: optionalEmail,
  shareEmail2: optionalEmail,
});

/** Zod issues → the flat `{ field: message }` map the API and forms use. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = String(issue.path[0] ?? "answers");
    if (!(path in fields)) fields[path] = issue.message;
  }
  return fields;
}
