"use client";

import { customerSchema } from "@/lib/booking/schema";
import { CARD, FIELD } from "@/components/ui/tokens";

import PhoneField from "./PhoneField";
import type { DetailsDraft } from "./state";

/** What `customerSchema` calls each field, so its messages land in the right place. */
export type DetailsField = "firstName" | "lastName" | "email" | "phoneE164" | "note";

/**
 * `customerSchema` run against the whole draft, reduced to one field's message.
 *
 * Validating the whole object every time is deliberate: the schema is the only
 * definition of what "valid" means here and it is the same object the route
 * handler runs, so the form can never accept something the server refuses.
 */
export function validateDetails(
  details: DetailsDraft,
): Record<string, string> {
  const result = customerSchema.safeParse({
    firstName: details.firstName,
    lastName: details.lastName,
    email: details.email,
    phoneE164: details.phoneE164,
    note: details.note,
  });

  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!(path in errors)) errors[path] = issue.message;
  }
  return errors;
}

/**
 * Step 4 — who to put the booking under.
 *
 * Labels are visible, following `ContactForm`: the WordPress original labelled
 * its fields with placeholders alone, which disappear the moment anyone starts
 * typing and leave a column of unmarked boxes.
 *
 * Only the first name and the phone are required. The phone is what the studio
 * actually uses to reach a guest — the confirmation goes out over WhatsApp —
 * so an email address is welcome but not a condition of booking.
 */
export default function DetailsStep({
  details,
  errors,
  onField,
  onPhone,
  onBlurField,
}: {
  details: DetailsDraft;
  errors: Record<string, string>;
  onField: (field: keyof DetailsDraft, value: string) => void;
  onPhone: (country: string, national: string, e164: string) => void;
  /** Validates on blur, so a mistake is caught before the Continue button. */
  onBlurField: (field: DetailsField) => void;
}) {
  const label = "page-label mb-1.5 block";
  const help = (field: DetailsField) =>
    errors[field] ? `booking-${field}-error` : undefined;
  /* The invalid state is a heavier olive border rather than a red one: the
     palette is pinned to olive, cream and black, and DESIGN.md's rule is that
     the redesign moves structure, not the brand's colours. */
  const field = (name: DetailsField) =>
    `${FIELD}${errors[name] ? " booking-field-invalid" : ""}`;

  return (
    <div className={`flex flex-col gap-4 ${CARD} p-[clamp(1.25rem,3vw,1.75rem)]`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="booking-firstName" className={label}>
            First name
          </label>
          <input
            id="booking-firstName"
            name="firstName"
            type="text"
            required
            maxLength={80}
            autoComplete="given-name"
            value={details.firstName}
            onChange={(event) => onField("firstName", event.target.value)}
            onBlur={() => onBlurField("firstName")}
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={help("firstName")}
            className={field("firstName")}
          />
          <FieldError field="firstName" message={errors.firstName} />
        </div>

        <div>
          <label htmlFor="booking-lastName" className={label}>
            Last name
          </label>
          <input
            id="booking-lastName"
            name="lastName"
            type="text"
            maxLength={80}
            autoComplete="family-name"
            value={details.lastName}
            onChange={(event) => onField("lastName", event.target.value)}
            onBlur={() => onBlurField("lastName")}
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={help("lastName")}
            className={field("lastName")}
          />
          <FieldError field="lastName" message={errors.lastName} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="booking-email" className={label}>
            Email
          </label>
          <input
            id="booking-email"
            name="email"
            type="email"
            maxLength={200}
            autoComplete="email"
            value={details.email}
            onChange={(event) => onField("email", event.target.value)}
            onBlur={() => onBlurField("email")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={help("email")}
            className={field("email")}
          />
          <FieldError field="email" message={errors.email} />
        </div>

        <div>
          <label htmlFor="booking-phone" className={label}>
            Phone number
          </label>
          <PhoneField
            id="booking-phone"
            country={details.phoneCountry}
            national={details.phoneNational}
            error={errors.phoneE164}
            describedBy={help("phoneE164")}
            onChange={onPhone}
            onBlur={() => onBlurField("phoneE164")}
          />
          <FieldError field="phoneE164" message={errors.phoneE164} />
        </div>
      </div>

      <div>
        <label htmlFor="booking-note" className={label}>
          Anything we should know
        </label>
        <textarea
          id="booking-note"
          name="note"
          rows={4}
          maxLength={1000}
          value={details.note}
          onChange={(event) => onField("note", event.target.value)}
          onBlur={() => onBlurField("note")}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={help("note")}
          className={`${field("note")} resize-y`}
        />
        <FieldError field="note" message={errors.note} />
      </div>

      {/* Honeypot. Off-screen, out of the tab order and hidden from assistive
          technology, so nobody using the site can reach it; anything that
          arrives filled in came from a bot. */}
      <div className="booking-honeypot" aria-hidden>
        <label htmlFor="booking-website">Website</label>
        <input
          id="booking-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={details.website}
          onChange={(event) => onField("website", event.target.value)}
        />
      </div>
    </div>
  );
}

function FieldError({
  field,
  message,
}: {
  field: DetailsField;
  message?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={`booking-${field}-error`}
      className="mt-1.5 font-body text-[13px] leading-[1.5] font-bold text-primary-strong"
    >
      {message}
    </p>
  );
}
