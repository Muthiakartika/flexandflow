/**
 * The one path from "a charge changed" to "the booking changed".
 *
 * Everything that could move money — the callback route, an admin re-checking
 * a charge by hand, a reconciliation sweep — comes through this function. Not
 * for tidiness: it is where the four rules in PAYMENT-PLAN.md §5 are actually
 * enforced, and a second path that wrote `Payment.status` directly would be a
 * second path that forgot one of them.
 *
 * The rules, as they appear below:
 *
 *   - **The gateway is asked, never told.** `refetchCharge` is the first thing
 *     that happens. A callback body proves only that somebody knew our URL; a
 *     matching token proves the sender is Xendit but not that the body is
 *     unedited. The status and the amount are read back over the API, and the
 *     caller does not even get to pass them in.
 *   - **Applying is a compare-and-set.** The status only moves from the value
 *     it was read at, so of two callbacks arriving together exactly one is the
 *     one that "applied" — the other returns `applied: false` and queues no
 *     second confirmation.
 *   - **The customer's confirmation is queued here, and only here, for the
 *     online path.** `POST /api/booking` queues it the moment the row commits
 *     for a pay-at-the-studio booking; it must not for an online one, or a
 *     customer who never pays still gets a confirmation (PAYMENT-PLAN.md §7).
 *   - **Nothing is sent from here.** Jobs are written and left; the caller runs
 *     `after(() => dispatchPending())` once its response is already on its way,
 *     exactly as the booking route does.
 */
import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { expireBookingHold, markBookingPaid } from "@/lib/booking/transitions";
import { prisma } from "@/lib/db";
import { queueBookingCreated } from "@/lib/notifications";
import { refetchCharge } from "@/lib/payments/charges";
import { isSettled, type PaymentStatusValue } from "@/lib/payments/types";

/** `lastError` is a diagnostic, not a transcript — as in the job queue. */
const MAX_ERROR_LENGTH = 400;

/**
 * What the admin panel reads when the studio owes somebody their money back.
 *
 * Deliberately a sentence a person can act on rather than a code: whoever sees
 * it has to make a bank transfer, and most Indonesian rails have no refund API
 * to press a button on (PAYMENT-PLAN.md §8).
 */
const REFUND_OWED =
  "Paid after the booking was cancelled. The money arrived but the slot is " +
  "gone — this needs a manual refund.";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The gateway's response, flattened to something a Json column will take.
 *
 * `undefined` rather than `null` when there is nothing to store, so the field
 * can be omitted from the update instead of overwriting evidence we already
 * hold with a null.
 */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

async function recordError(paymentId: string, message: string): Promise<void> {
  try {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { lastError: message.slice(0, MAX_ERROR_LENGTH) },
    });
  } catch (error) {
    /* If even this write fails there is nowhere left to put the fact. The log
       is the last resort; it must not throw into the callback route, which
       would make Xendit retry a charge that may already have been applied. */
    console.error("[payments] could not record a settlement error", error);
  }
}

/**
 * Money for a booking that is no longer taking it.
 *
 * The hold lapsed a few seconds before the callback landed, or the studio
 * cancelled by hand while the customer was at the payment screen. Confirming
 * anyway would be worse than useless — the slot may already belong to somebody
 * else, and the booking would be quietly double-sold to hide a refund. So the
 * charge keeps its `PAID` status, which is the truth, and the booking keeps
 * its `CANCELLED` status, which is also the truth, and the discrepancy is
 * written down where a human will see it. PAYMENT-PLAN.md §11 risk 3.
 */
async function flagRefundOwed(
  paymentId: string,
  bookingId: string,
  detail: string,
): Promise<void> {
  console.error(
    `[payments] refund owed on payment ${paymentId} for booking ${bookingId}`,
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { lastError: `${REFUND_OWED} ${detail}`.slice(0, MAX_ERROR_LENGTH) },
      });

      /* On `Payment` rather than `Booking`: this is a fact about the money,
         and a disputed payment is argued from the audit trail and
         `rawPayload` together. */
      await tx.auditLog.create({
        data: {
          actor: "system",
          action: "payment.refund_owed",
          entity: "Payment",
          entityId: paymentId,
          meta: { bookingId, detail },
        },
      });
    });
  } catch (error) {
    console.error("[payments] could not flag a refund", error);
  }
}

/**
 * The settled path: confirm the booking, then queue the confirmation.
 *
 * In that order and not the other way round. A confirmation for a booking that
 * failed to confirm is a message the studio cannot honour.
 */
async function applySettlement(
  paymentId: string,
  bookingId: string,
  amountPaidIdr: number,
): Promise<void> {
  const result = await markBookingPaid({
    bookingId,
    amountPaidIdr,
    /* The customer paid this one. `"admin"` is what the panel passes when a
       member of staff records cash taken at the desk. */
    by: "customer",
  });

  if (!result.ok) {
    await flagRefundOwed(paymentId, bookingId, result.message);
    return;
  }

  try {
    /* Where the online path finally tells the customer their appointment is
       real. Idempotent by the unique index on the job rows, so a duplicate
       callback that somehow got this far still sends one email. */
    await queueBookingCreated(bookingId);
  } catch (error) {
    /* The money is in and the booking is confirmed; a queue write that failed
       must not undo either, and must not turn into a non-200 that has Xendit
       resend the charge. The rows are written again by the next attempt or
       found by the reminder backstop. */
    console.error("[payments] could not queue the confirmation", error);
  }
}

/**
 * Bring one payment, and the booking behind it, up to date with the gateway.
 *
 * Returns `null` when there is no such payment or the gateway had nothing to
 * say about it, and `applied: false` when the status had not moved — so a
 * repeated callback is a no-op rather than a second confirmation.
 */
export async function settlePayment(
  paymentId: string,
): Promise<{ applied: boolean; status: PaymentStatusValue } | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, bookingId: true, status: true },
  });

  if (!payment) return null;

  const previous = payment.status;

  let fresh: Awaited<ReturnType<typeof refetchCharge>>;

  try {
    fresh = await refetchCharge(paymentId);
  } catch (error) {
    /*
     * The gateway is unreachable, so there is nothing this may act on — rule
     * one is that the callback body is not evidence, and a guess is worse than
     * a body. The failure is written to the row so it shows in the admin panel
     * rather than disappearing into a log, and the booking keeps its hold: if
     * the money really did arrive, the charge is still `PAID` at Xendit and a
     * re-check settles it; if it did not, the sweeper frees the slot.
     */
    await recordError(paymentId, `Could not re-fetch the charge: ${describe(error)}`);
    return null;
  }

  /* No charge on record at the gateway — usually one that was never opened. */
  if (!fresh) return null;

  const next = fresh.status;
  const raw = toJson(fresh.raw);
  const payload = raw === undefined ? {} : { rawPayload: raw };

  if (next === previous) {
    /* Nothing moved, but the freshest copy of the gateway's answer is still
       worth holding: it is what a disputed payment is argued from. */
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amountPaidIdr: fresh.amountPaidIdr,
        paidAt: fresh.paidAt,
        ...payload,
      },
    });

    return { applied: false, status: next };
  }

  /*
   * Compare-and-set on the status we read, the same interlock `claim()` uses
   * in the notification queue. Two callbacks for the same charge arriving
   * together both see `PENDING`; only the one whose UPDATE still matches
   * `PENDING` gets to touch the booking. The loser reports `applied: false`
   * and stops there, which is what keeps the confirmation from going out twice.
   */
  const moved = await prisma.payment.updateMany({
    where: { id: payment.id, status: previous },
    data: {
      status: next,
      amountPaidIdr: fresh.amountPaidIdr,
      paidAt: fresh.paidAt,
      ...payload,
    },
  });

  if (moved.count === 0) return { applied: false, status: next };

  if (isSettled(next)) {
    await applySettlement(payment.id, payment.bookingId, fresh.amountPaidIdr);
    return { applied: true, status: next };
  }

  if (next === "EXPIRED" || next === "FAILED") {
    await expireBookingHold({
      bookingId: payment.bookingId,
      reason:
        next === "EXPIRED"
          ? "The payment expired before it was completed."
          : "The payment failed.",
    });

    return { applied: true, status: next };
  }

  /*
   * `REFUNDED` is the remaining case, and it deliberately leaves the booking
   * alone. A full refund is issued by a person who has already decided what
   * happens to the appointment — sometimes it is cancelled, sometimes the
   * studio is refunding a session it still intends to give. Guessing here
   * would overrule them. The status on the charge is the record; the booking
   * is moved from the admin panel.
   */
  return { applied: true, status: next };
}
