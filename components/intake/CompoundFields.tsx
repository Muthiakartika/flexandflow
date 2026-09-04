"use client";

import { FieldShell } from "@/components/intake/FieldShell";
import { FIELD } from "@/components/ui/tokens";
import type { AddressAnswer, NameAnswer } from "@/lib/intake/schema";
import type { PublicIntakeField } from "@/lib/intake/types";

/** First + last only — no middle name, dropped 2026-09-03 for every NAME
 *  field at once (see `lib/intake/schema.ts`'s `NameAnswer`). */
export function NameField({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicIntakeField;
  value: NameAnswer;
  onChange: (value: NameAnswer) => void;
  error?: string;
}) {
  const set = (part: keyof NameAnswer, partValue: string) =>
    onChange({ ...value, [part]: partValue });

  return (
    <FieldShell
      label={field.label}
      htmlFor={`${field.fieldKey}-firstName`}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            id={`${field.fieldKey}-firstName`}
            value={value.firstName}
            onChange={(event) => set("firstName", event.target.value)}
            placeholder="First Name"
            className={FIELD}
            aria-invalid={Boolean(error) || undefined}
          />
          <p className="mt-1 text-[12px] text-body-text/50">First Name</p>
        </div>
        <div>
          <input
            value={value.lastName}
            onChange={(event) => set("lastName", event.target.value)}
            placeholder="Last Name"
            className={FIELD}
          />
          <p className="mt-1 text-[12px] text-body-text/50">Last Name</p>
        </div>
      </div>
    </FieldShell>
  );
}

export function AddressField({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicIntakeField;
  value: AddressAnswer;
  onChange: (value: AddressAnswer) => void;
  error?: string;
}) {
  const set = (part: keyof AddressAnswer, partValue: string) =>
    onChange({ ...value, [part]: partValue });

  return (
    <FieldShell
      label={field.label}
      htmlFor={`${field.fieldKey}-street`}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <div className="grid gap-3">
        <input
          id={`${field.fieldKey}-street`}
          value={value.street}
          onChange={(event) => set("street", event.target.value)}
          placeholder="Street Address"
          className={FIELD}
          aria-invalid={Boolean(error) || undefined}
        />
        <input
          value={value.street2}
          onChange={(event) => set("street2", event.target.value)}
          placeholder="Street Address Line 2"
          className={FIELD}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={value.city}
            onChange={(event) => set("city", event.target.value)}
            placeholder="City"
            className={FIELD}
          />
          <input
            value={value.state}
            onChange={(event) => set("state", event.target.value)}
            placeholder="State / Province"
            className={FIELD}
          />
          <input
            value={value.zip}
            onChange={(event) => set("zip", event.target.value)}
            placeholder="Postal / Zip Code"
            className={FIELD}
          />
        </div>
      </div>
    </FieldShell>
  );
}
