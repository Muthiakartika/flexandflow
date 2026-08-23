"use client";

import { useId } from "react";

import type { PaymentMethodValue } from "@/lib/payments/types";

/**
 * How the visitor would like to pay, asked on the summary step.
 *
 * Two things about this are deliberate and should survive editing.
 *
 * **Paying at the studio is the default**, because it is the behaviour that
 * already exists and already works: a booking made that way is confirmed the
 * moment it is saved. Paying now is the addition, and an addition should not
 * quietly become the path everybody is put on.
 *
 * **The second option disappears entirely when the gateway is not configured.**
 * It is not disabled with an explanation — an option that cannot be taken is
 * worse than no option — and whether it can be offered is decided on the
 * server and handed down as a prop, because a client component reading
 * `process.env` reads whatever was baked into the bundle at build time.
 */

const OPTIONS: ReadonlyArray<{
  value: PaymentMethodValue;
  title: string;
  note: string;
}> = [
  {
    value: "AT_STUDIO",
    title: "Pay at the studio",
    note: "Cash or card when you arrive",
  },
  {
    value: "ONLINE",
    title: "Pay now",
    note: "QRIS, bank transfer, e-wallet or card",
  },
];

export default function PaymentMethodChoice({
  value,
  onChange,
  paymentsEnabled,
  disabled = false,
}: {
  value: PaymentMethodValue;
  onChange: (method: PaymentMethodValue) => void;
  /** False unless the gateway is configured; see the note above. */
  paymentsEnabled: boolean;
  disabled?: boolean;
}) {
  const name = useId();

  const options = paymentsEnabled
    ? OPTIONS
    : OPTIONS.filter((option) => option.value === "AT_STUDIO");

  /* With nothing to choose between there is no question to ask. */
  if (options.length < 2) return null;

  return (
    <fieldset className="payment-method-group">
      <legend className="page-label">Payment</legend>

      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="payment-method"
            data-selected={value === option.value}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="payment-radio"
            />
            <span className="grid gap-1">
              <span className="font-body text-[15px] leading-none">
                {option.title}
              </span>
              <span className="payment-method-note font-body text-[13px] leading-[1.5]">
                {option.note}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
