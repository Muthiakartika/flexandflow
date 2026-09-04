"use client";

import { useState } from "react";

import { FieldShell } from "@/components/intake/FieldShell";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type PublicIntakeField,
} from "@/lib/intake/types";

/**
 * A file, not a string, so it does not fit the same `value`/`onChange`
 * shape as every other field — `Answers` is what gets JSON-stringified into
 * the sessionStorage draft, and a `File` cannot survive that. `IntakeForm`
 * holds the picked file in a ref keyed by `fieldKey` instead, entirely
 * outside `state.answers`, the same way the signature pad's drawing does —
 * see `imageFilesRef` there.
 */
export function ImageField({
  field,
  onFileChange,
  error,
}: {
  field: PublicIntakeField;
  onFileChange: (file: File | null) => void;
  error?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setFileName(null);
      setLocalError(null);
      onFileChange(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFileName(null);
      setLocalError("Please choose a JPEG, PNG or WebP image.");
      onFileChange(null);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFileName(null);
      setLocalError("That image is too large — please choose one under 3MB.");
      onFileChange(null);
      return;
    }

    setLocalError(null);
    setFileName(file.name);
    onFileChange(file);
  }

  return (
    <FieldShell
      label={field.label}
      htmlFor={field.fieldKey}
      required={field.required}
      helpText={field.helpText}
      error={error || localError || undefined}
    >
      <input
        id={field.fieldKey}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleChange}
        className="block w-full font-body text-[14px] text-body-text file:mr-4 file:rounded-[10px] file:border file:border-secondary/20 file:bg-white file:px-4 file:py-2 file:font-body file:text-[13px] file:text-body-text hover:file:border-primary"
        aria-invalid={Boolean(error || localError) || undefined}
      />
      {fileName ? (
        <p className="mt-1.5 text-[13px] text-body-text/60">Selected: {fileName}</p>
      ) : null}
    </FieldShell>
  );
}
