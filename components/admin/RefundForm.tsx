"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { recordRefundAction } from "@/lib/admin/actions";
import { formatIdr } from "@/lib/booking/format";
import {
  PAYMENT_CHANNEL_LABEL,
  type PaymentSummary,
} from "@/lib/payments/types";

/**
 * The form that records a refund — and the one screen in this panel that has
 * to talk somebody out of an assumption.
 *
 * Every other button here does the thing it says. This one does not: it writes
 * a row. QRIS and virtual account, which is nearly every payment this studio
 * will take, have no refund API in Indonesia — the money goes back as a bank
 * transfer a person makes from the studio's own account, and this is the record
 * that they made it. See PAYMENT-PLAN.md §8.
 *
 * So the copy says so three times over, in three different places: above the
 * fields, on the note's own label, and in the sentence the action hands back
 * afterwards. Someone who fills this in believing the customer has now been
 * repaid will not chase the transfer, and the customer will be left waiting for
 * money nobody sent.
 */
export function RefundForm({ payment }: { payment: PaymentSummary }) {
  const [state, action] = useActionState<ActionState, FormData>(
    recordRefundAction,
    IDLE,
  );

  const refundable = payment.amountPaidIdr - payment.refundedIdr;
  const partial = payment.refundedIdr > 0;
  const card = payment.channel === "CARD";
  const fieldId = `refund-${payment.id}`;

  return (
    <form action={action} className="admin-card p-4">
      <input type="hidden" name="paymentId" value={payment.id} />

      <h3 className="text-[15px] font-bold text-ink">
        Record a refund — {PAYMENT_CHANNEL_LABEL[payment.channel]} charge,{" "}
        {formatIdr(payment.amountPaidIdr)} received
      </h3>

      {/* The warning is a bordered block rather than a line of small print
          because it is the single most misreadable thing on the page. */}
      <p className="mt-2 rounded-[8px] border border-warn/50 bg-warn-soft px-3 py-2 text-[13px] font-bold text-warn">
        This does not move any money.
        {card ? (
          <>
            {" "}
            This charge was on a card, so the refund itself is issued from the
            Xendit dashboard. Do that first, then fill this in so the studio has
            a record of it.
          </>
        ) : (
          <>
            {" "}
            {PAYMENT_CHANNEL_LABEL[payment.channel]} has no refund API in
            Indonesia: somebody at the studio transfers the money back from the
            studio&rsquo;s own bank account. Fill this in{" "}
            <em className="not-italic underline">after</em> that transfer has
            gone out, never before — this form is the record of it, not the
            cause of it.
          </>
        )}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        <div>
          <label className="admin-label" htmlFor={`${fieldId}-amount`}>
            Amount refunded (IDR)
          </label>
          <input
            id={`${fieldId}-amount`}
            name="amountIdr"
            type="text"
            inputMode="numeric"
            required
            defaultValue={String(refundable)}
            className="admin-input"
          />
          <FieldError message={state.fields?.amountIdr} />
          <p className="mt-1 text-[12px] text-faint">
            {partial
              ? `${formatIdr(payment.refundedIdr)} already returned. At most ${formatIdr(refundable)} is left.`
              : `At most ${formatIdr(refundable)} — what actually arrived.`}
          </p>
        </div>

        <div>
          <label className="admin-label" htmlFor={`${fieldId}-note`}>
            How the money was returned
          </label>
          <textarea
            id={`${fieldId}-note`}
            name="note"
            rows={2}
            required
            className="admin-input"
            placeholder={
              card
                ? "Refunded in the Xendit dashboard, 4 Aug, by Ginny"
                : "Transferred to BCA 1234567890 (a/n Sarah W.), 4 Aug, by Ginny"
            }
          />
          <FieldError message={state.fields?.note} />
          <p className="mt-1 text-[12px] text-faint">
            Required. Say who sent it, to which account, and when — this note is
            the only answer the studio will have if the customer says the money
            never arrived.
          </p>
        </div>
      </div>

      <div className="mt-3">
        <SubmitButton pendingLabel="Recording…" variant="quiet">
          Record this refund
        </SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
