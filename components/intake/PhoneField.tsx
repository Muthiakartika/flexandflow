"use client";

import { useMemo, useState } from "react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { FieldShell } from "@/components/intake/FieldShell";
import { FormSelect } from "@/components/ui/FormSelect";
import { FIELD, SELECT_CONTENT, SELECT_TRIGGER } from "@/components/ui/tokens";
import type { PublicIntakeField } from "@/lib/intake/types";

/** ISO region code → flag emoji, via the two Unicode regional-indicator
 *  symbols that make it up (e.g. "ID" → 🇮🇩). */
function flagOf(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

/**
 * Country code plus national number, emitting E.164 — a client-facing sibling
 * of `components/booking/PhoneField.tsx`, which deliberately skips flags
 * ("ambiguous at 16px, and the country's own name says everything a flag
 * would"). This form's brief asked for a flag specifically, so it has one;
 * the country name stays alongside it rather than replacing it, so the
 * dropdown is still readable on a system whose font has no flag glyphs.
 *
 * Holds its own `country`/`national` state, seeded once from the incoming
 * E.164 value — after that it behaves like an ordinary uncontrolled text
 * field with a country picker bolted on, and only the derived E.164 string
 * is reported upward through `onChange`.
 */
export function PhoneField({
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
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries()
      .map((code) => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [country, setCountry] = useState<CountryCode>(() => {
    const parsed = value ? parsePhoneNumberFromString(value) : undefined;
    return (parsed?.country ?? "ID") as CountryCode;
  });

  const [national, setNational] = useState<string>(() => {
    const parsed = value ? parsePhoneNumberFromString(value) : undefined;
    return parsed ? parsed.formatNational() : "";
  });

  function emit(nextCountry: CountryCode, nextNational: string) {
    const formatted = new AsYouType(nextCountry).input(nextNational);
    const parsed = parsePhoneNumberFromString(nextNational, nextCountry);
    /* Falls back to the raw digits behind the dialling code so a half-typed
       number still reaches the form's own schema, which is what decides
       whether it is valid — this field never rejects one on its own. */
    const e164 =
      parsed?.number ??
      (nextNational.trim()
        ? `+${getCountryCallingCode(nextCountry)}${nextNational.replace(/\D/g, "")}`
        : "");

    setCountry(nextCountry);
    setNational(formatted);
    onChange(e164);
  }

  return (
    <FieldShell
      label={field.label}
      htmlFor={field.fieldKey}
      required={field.required}
      helpText={field.helpText}
      error={error}
    >
      <div className="intake-phone-fields">
        <label htmlFor={`${field.fieldKey}-country`} className="sr-only">
          Country code
        </label>
        <FormSelect
          id={`${field.fieldKey}-country`}
          value={country}
          onValueChange={(next) => emit(next as CountryCode, national)}
          ariaLabel="Country code"
          options={countries.map((option) => ({
            value: option.code,
            label: `${flagOf(option.code)} ${option.name} (+${option.dial})`,
          }))}
          triggerClassName={`${SELECT_TRIGGER} min-w-0 truncate`}
          contentClassName={SELECT_CONTENT}
        />

        <input
          id={field.fieldKey}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(event) => emit(country, event.target.value)}
          className={`${FIELD} min-w-0`}
          aria-invalid={Boolean(error) || undefined}
        />
      </div>
    </FieldShell>
  );
}
