"use client";

import { useMemo } from "react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { FIELD } from "@/components/ui/tokens";

/**
 * Country code plus national number, emitting E.164.
 *
 * No flags. A flag is an image per country, it is ambiguous at 16px, and it
 * tells a visitor nothing they cannot read from the country's own name — which
 * is what this shows instead, with its dialling code beside it.
 *
 * Indonesia is the default because that is who walks in, but the whole list is
 * there: a guest booking from abroad gives the number their phone actually
 * has, and WAHA is handed the E.164 form either way.
 */
export default function PhoneField({
  id,
  country,
  national,
  error,
  describedBy,
  onChange,
  onBlur,
}: {
  id: string;
  country: string;
  national: string;
  error?: string;
  describedBy?: string;
  /** Fires with both halves and the E.164 form the API will receive. */
  onChange: (country: string, national: string, e164: string) => void;
  onBlur: () => void;
}) {
  const countries = useMemo(() => {
    /* `Intl.DisplayNames` is in every browser this site supports and saves
       shipping a 250-entry name table in the bundle. */
    const names = new Intl.DisplayNames(["en"], { type: "region" });

    return getCountries()
      .map((code) => ({
        code,
        name: names.of(code) ?? code,
        dial: getCountryCallingCode(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selected = (country || "ID") as CountryCode;

  function emit(nextCountry: CountryCode, nextNational: string) {
    const formatted = new AsYouType(nextCountry).input(nextNational);
    const parsed = parsePhoneNumberFromString(nextNational, nextCountry);
    /* Falls back to the raw digits behind the dialling code so a half-typed
       number still reaches `customerSchema`, which is what decides whether it
       is valid — this field never gets to reject one on its own. */
    const e164 =
      parsed?.number ??
      (nextNational.trim()
        ? `+${getCountryCallingCode(nextCountry)}${nextNational.replace(/\D/g, "")}`
        : "");

    onChange(nextCountry, formatted, e164);
  }

  return (
    <div className="booking-phone">
      <label htmlFor={`${id}-country`} className="sr-only">
        Country code
      </label>
      <select
        id={`${id}-country`}
        value={selected}
        onChange={(event) => emit(event.target.value as CountryCode, national)}
        onBlur={onBlur}
        className={`${FIELD} booking-phone-country`}
      >
        {countries.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name} +{option.dial}
          </option>
        ))}
      </select>

      <input
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required
        value={national}
        onChange={(event) => emit(selected, event.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${FIELD}${error ? " booking-field-invalid" : ""}`}
      />
    </div>
  );
}
