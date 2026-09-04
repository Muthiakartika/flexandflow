"use client";

import { FieldShell } from "@/components/intake/FieldShell";
import { FIELD } from "@/components/ui/tokens";
import type { PublicIntakeField } from "@/lib/intake/types";
import { CORE_FIELD_KEYS } from "@/lib/intake/schema";

type Props = {
  field: PublicIntakeField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function TextField({ field, value, onChange, error }: Props) {
  return (
    <FieldShell
      label={field.label}
      htmlFor={field.fieldKey}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <input
        id={field.fieldKey}
        type={field.fieldKey === CORE_FIELD_KEYS.email ? "email" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD}
        aria-invalid={Boolean(error) || undefined}
      />
    </FieldShell>
  );
}

export function TextareaField({ field, value, onChange, error }: Props) {
  return (
    <FieldShell
      label={field.label}
      htmlFor={field.fieldKey}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <textarea
        id={field.fieldKey}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD} resize-y`}
        aria-invalid={Boolean(error) || undefined}
      />
    </FieldShell>
  );
}

export function DateField({ field, value, onChange, error }: Props) {
  return (
    <FieldShell
      label={field.label}
      htmlFor={field.fieldKey}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <input
        id={field.fieldKey}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD}
        aria-invalid={Boolean(error) || undefined}
      />
    </FieldShell>
  );
}
