"use client";

import { CARD, LINK } from "@/components/ui/tokens";
import {
  formatDuration,
  formatIdr,
  formatPhoneDisplay,
  fullName,
} from "@/lib/booking/format";
import { formatMinuteOfDay12h, formatStudioDate } from "@/lib/booking/time";
import {
  ANY_STAFF,
  TIER_LABEL,
  type Slot,
  type StaffOption,
  type StaffSelection,
  type VariantOption,
} from "@/lib/booking/types";
import { contact } from "@/lib/site";

import type { PaymentMethodValue } from "@/lib/payments/types";

import PaymentMethodChoice from "./PaymentMethodChoice";
import type { DetailsDraft } from "./state";

/**
 * Step 5 — everything, once, before it is real.
 *
 * The price shown is the variant's own `priceIdr`, unmodified. There is no
 * total to compute — one session, one price — and the moment this screen starts
 * doing arithmetic it becomes a second source of truth for money.
 *
 * It is also where the one remaining question is asked: pay at the studio, as
 * everybody has until now, or pay before leaving this page. The second option
 * only exists when the gateway is configured — see `PaymentMethodChoice`.
 */
export default function SummaryStep({
  staff,
  staffOption,
  variant,
  slot,
  details,
  cancelCutoffHours,
  paymentsEnabled = false,
  paymentMethod,
  onPaymentMethod,
  disabled = false,
}: {
  staff: StaffSelection;
  staffOption: StaffOption | null;
  variant: VariantOption;
  slot: Slot;
  details: DetailsDraft;
  /** How many hours before the session a guest can still cancel themselves. */
  cancelCutoffHours: number;
  /**
   * Whether paying online can be offered at all. Defaults to **false**: a
   * wizard that was never told cannot put a visitor in front of a payment
   * method that would fail, and this is decided on the server — a client
   * component reading `process.env` reads whatever the build baked in.
   */
  paymentsEnabled?: boolean;
  paymentMethod: PaymentMethodValue;
  onPaymentMethod: (method: PaymentMethodValue) => void;
  /** True while the booking is being saved. */
  disabled?: boolean;
}) {
  const start = new Date(slot.startAt);

  const rows: Array<{ term: string; detail: string }> = [
    {
      term: "Staff",
      detail:
        staff === ANY_STAFF
          ? "Any Staff — first available"
          : `${staffOption?.displayName ?? "Your therapist"} · ${
              staffOption ? TIER_LABEL[staffOption.tier] : ""
            }`.trim(),
    },
    { term: "Treatment", detail: variant.serviceTitle },
    { term: "Length", detail: formatDuration(variant.durationMinutes) },
    { term: "Date", detail: formatStudioDate(start) },
    {
      term: "Time",
      detail: `${formatMinuteOfDay12h(slot.startMinute)} – ${formatMinuteOfDay12h(
        slot.endMinute,
      )} (WITA)`,
    },
    { term: "Name", detail: fullName(details.firstName, details.lastName) },
    { term: "Phone", detail: formatPhoneDisplay(details.phoneE164) },
  ];

  if (details.email) rows.push({ term: "Email", detail: details.email });
  if (details.note) rows.push({ term: "Note", detail: details.note });

  return (
    <div className="flex flex-col gap-5">
      <div className={`${CARD} p-5 sm:p-6`}>
        <dl className="grid gap-0">
          {rows.map((row) => (
            <div
              key={row.term}
              className="grid gap-1 border-t border-secondary/10 py-3 first:border-t-0 first:pt-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="page-label sm:pt-1">{row.term}</dt>
              <dd className="font-body text-[15px] leading-[1.6]">
                {row.detail}
              </dd>
            </div>
          ))}

          <div className="grid items-baseline gap-1 border-t border-secondary/10 pt-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
            <dt className="page-label">Total</dt>
            <dd className="font-display text-[30px] leading-none font-bold tabular-nums">
              {formatIdr(variant.priceIdr)}
            </dd>
          </div>
        </dl>
      </div>

      {paymentsEnabled ? (
        <div className={`${CARD} p-5 sm:p-6`}>
          <PaymentMethodChoice
            value={paymentMethod}
            onChange={onPaymentMethod}
            paymentsEnabled={paymentsEnabled}
            disabled={disabled}
          />
        </div>
      ) : null}

      {/* Refund terms belong here, above the button, and there are none to
          state yet: the studio has not decided what a cancellation gets back
          once money has actually changed hands (PAYMENT-PLAN.md §10.2). Ask
          the owner and write their answer here — do not invent one. */}
      <p className="font-body text-[14px] leading-[1.7] text-body-text/75">
        {/* Guarded on `paymentsEnabled` too: a draft saved while the gateway
            was configured can still be carrying `ONLINE`, and the wizard falls
            back to paying at the studio in exactly the same way. */}
        {paymentsEnabled && paymentMethod === "ONLINE"
          ? "You'll pay here, without leaving this page. Your time is held while you pay, and the booking is confirmed once the payment lands. "
          : "Payment is at the studio. "}
        You can cancel or move your session yourself up to {cancelCutoffHours}{" "}
        hours before it starts, using the link in your confirmation — after
        that, message us on{" "}
        <a
          href={contact.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          WhatsApp
        </a>
        .
      </p>
    </div>
  );
}
