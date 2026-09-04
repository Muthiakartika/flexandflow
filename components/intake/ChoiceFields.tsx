"use client";

import { FieldShell } from "@/components/intake/FieldShell";
import { FormSelect } from "@/components/ui/FormSelect";
import { SELECT_CONTENT, SELECT_TRIGGER } from "@/components/ui/tokens";
import type { PublicIntakeField } from "@/lib/intake/types";

export function DropdownField({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicIntakeField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <FieldShell
      label={field.label}
      htmlFor={field.fieldKey}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <FormSelect
        id={field.fieldKey}
        options={field.options.map((option) => ({ value: option, label: option }))}
        value={value}
        onValueChange={onChange}
        placeholder="Please Select"
        triggerClassName={SELECT_TRIGGER}
        contentClassName={SELECT_CONTENT}
        ariaInvalid={Boolean(error)}
      />
    </FieldShell>
  );
}

const YES_NO_OPTIONS = ["Yes", "No"];

export function YesNoField({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicIntakeField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <DropdownField
      field={{ ...field, options: YES_NO_OPTIONS }}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}

/** Single choice, every option visible at once — unlike DropdownField, which
 *  hides everything but the current pick behind a trigger. Same answer
 *  shape as DropdownField (one string), different UI for when a short list
 *  is worth showing in full rather than making someone open a menu. */
export function RadioField({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicIntakeField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <FieldShell
      label={field.label}
      htmlFor={`${field.fieldKey}-0`}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <div
        role="radiogroup"
        aria-invalid={Boolean(error) || undefined}
        className="flex flex-col gap-2.5"
      >
        {field.options.map((option, index) => (
          <label
            key={option}
            htmlFor={index === 0 ? `${field.fieldKey}-0` : undefined}
            className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-body-text"
          >
            <input
              id={index === 0 ? `${field.fieldKey}-0` : undefined}
              type="radio"
              name={field.fieldKey}
              checked={value === option}
              onChange={() => onChange(option)}
              className="mt-0.5 size-4 shrink-0"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}

export function CheckboxGroupField({
  field,
  value,
  onChange,
  error,
}: {
  field: PublicIntakeField;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  function toggle(option: string) {
    onChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option],
    );
  }

  return (
    <FieldShell
      label={field.label}
      htmlFor={`${field.fieldKey}-0`}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <div className="flex flex-col gap-2.5">
        {field.options.map((option, index) => (
          <label
            key={option}
            htmlFor={index === 0 ? `${field.fieldKey}-0` : undefined}
            className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-body-text"
          >
            <input
              id={index === 0 ? `${field.fieldKey}-0` : undefined}
              type="checkbox"
              checked={value.includes(option)}
              onChange={() => toggle(option)}
              className="mt-0.5 size-4 shrink-0"
              aria-invalid={Boolean(error) || undefined}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}
