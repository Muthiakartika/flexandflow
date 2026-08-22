/**
 * Validation, defined once and used on both sides.
 *
 * The wizard validates with these before it lets a step advance, and the route
 * handlers validate with the same objects before they touch the database.
 * There is no second set of rules that can drift out of agreement with the
 * first — which is how a form ends up accepting something the server rejects.
 *
 * Safe to import from client components: Zod only, no environment, no database.
 */
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { z } from "zod";

import { isIsoDate } from "@/lib/booking/time";
import { ANY_STAFF } from "@/lib/booking/types";

/** `2026-08-25`, a studio-local calendar day. */
export const isoDateSchema = z
  .string()
  .refine(isIsoDate, "Expected a YYYY-MM-DD date");

/** `2026-08`, a studio-local month. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a YYYY-MM month");

export const instantSchema = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Expected an ISO 8601 instant",
  );

/** A therapist id, or the "Any Staff" sentinel. */
export const staffSchema = z.union([z.literal(ANY_STAFF), z.string().min(1)]);

/**
 * Normalises whatever the phone field contains into E.164.
 *
 * The default region is Indonesia because that is who walks in, but the input
 * carries a country selector and anything already in international form is
 * respected. WAHA needs E.164 with no punctuation, so this is the only shape
 * allowed past the boundary.
 */
export const phoneSchema = z
  .string()
  .min(5, "Enter your phone number")
  .transform((value, ctx) => {
    try {
      const parsed = parsePhoneNumberWithError(value.trim(), "ID");
      if (!parsed.isValid()) {
        ctx.addIssue({
          code: "custom",
          message: "That phone number does not look right",
        });
        return z.NEVER;
      }
      return parsed.number;
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "That phone number does not look right",
      });
      return z.NEVER;
    }
  });

/** Trims, then turns an empty string into null rather than storing `""`. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .nullable()
    .default(null);

export const customerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name")
    .max(80, "That is longer than 80 characters"),
  lastName: optionalText(80),
  email: z
    .union([z.email("That email address does not look right"), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
  phoneE164: phoneSchema,
  note: optionalText(1000),
});

export const createBookingSchema = z.object({
  staff: staffSchema,
  variantId: z.string().min(1, "Choose a service"),
  startAt: instantSchema,
  customer: customerSchema,
  turnstileToken: z.string().optional(),
  /**
   * Honeypot. A real person never sees this field, so anything in it is a bot
   * and the request is dropped without an explanation that would teach it.
   */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type CreateBookingPayload = z.infer<typeof createBookingSchema>;

export const slotsQuerySchema = z.object({
  staff: staffSchema,
  variantId: z.string().min(1),
  date: isoDateSchema,
});

export const availabilityQuerySchema = z.object({
  staff: staffSchema,
  variantId: z.string().min(1),
  month: monthSchema,
});

export const cancelBookingSchema = z.object({
  reason: optionalText(500),
});

export const rescheduleBookingSchema = z.object({
  startAt: instantSchema,
  /** Optional: keep the same therapist unless the customer picks another. */
  staff: staffSchema.optional(),
});

// ── Admin ────────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const workingHourSchema = z
  .object({
    therapistId: z.string().min(1),
    weekday: z.coerce.number().int().min(0).max(6),
    startMinute: z.coerce.number().int().min(0).max(24 * 60),
    endMinute: z.coerce.number().int().min(0).max(24 * 60),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "The end time must be after the start time",
    path: ["endMinute"],
  });

export const timeOffSchema = z
  .object({
    /** Null closes the studio for everyone that day. */
    therapistId: z.string().min(1).nullable().default(null),
    startAt: instantSchema,
    endAt: instantSchema,
    reason: optionalText(200),
  })
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
    message: "The end must be after the start",
    path: ["endAt"],
  });

export const variantUpdateSchema = z.object({
  id: z.string().min(1),
  priceIdr: z.coerce
    .number()
    .int("Prices are whole rupiah")
    .min(0)
    .max(1_000_000_000),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  active: z.boolean(),
});

export const adminBookingCreateSchema = z.object({
  therapistId: z.string().min(1),
  variantId: z.string().min(1),
  startAt: instantSchema,
  customer: customerSchema,
  /** Admin-entered bookings skip the customer's confirmation messages. */
  notify: z.boolean().default(true),
});

export const adminBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  reason: optionalText(500),
});

/** Zod issues → the flat `{ field: message }` map the API returns. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!(path in fields)) fields[path] = issue.message;
  }
  return fields;
}
