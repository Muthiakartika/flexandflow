/**
 * Charging a card the customer typed into the payment modal.
 *
 * What arrives here is a single-use token from Xendit.js and, when the bank
 * asked for one, the id of a completed 3-D Secure challenge. Never a card
 * number: that went straight from the browser to Xendit and this server has
 * never seen it.
 *
 * The amount is not in the request and must not be. It comes from the `Payment`
 * row, which took it from the booking, which took it from the catalogue — the
 * same rule that governs price and duration everywhere else in this system.
 */
import { after } from "next/server";

import { fail, ok, serverError } from "@/lib/api/respond";
import { readManageToken } from "@/lib/booking/tokens";
import { prisma } from "@/lib/db";
import { paymentsEnabled } from "@/lib/env";
import { dispatchPending, queueBookingCreated } from "@/lib/notifications";
import { markBookingPaid } from "@/lib/booking/transitions";
import { chargeCardToken } from "@/lib/payments/cards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOT_FOUND = "We could not find that booking.";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  const bookingId = readManageToken(token);

  if (!bookingId) return fail("NOT_FOUND", NOT_FOUND);
  if (!paymentsEnabled()) {
    return fail("VALIDATION", "Card payment is not available at the moment.");
  }

  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return fail("VALIDATION", "That request body was not valid JSON.");
  }

  const tokenId =
    typeof raw === "object" && raw !== null
      ? (raw as { tokenId?: unknown }).tokenId
      : undefined;
  const authenticationId =
    typeof raw === "object" && raw !== null
      ? (raw as { authenticationId?: unknown }).authenticationId
      : undefined;

  if (typeof tokenId !== "string" || tokenId.length === 0) {
    return fail("VALIDATION", "That card could not be read. Please try again.");
  }

  try {
    /* The newest pending card charge for this booking. Scoped by booking id so
       a token cannot be aimed at somebody else's payment: the manage token is
       the only thing that says which booking the caller may act on. */
    const payment = await prisma.payment.findFirst({
      where: { bookingId, channel: "CARD", status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!payment) {
      return fail("NOT_FOUND", "There is no card payment waiting on this booking.");
    }

    const result = await chargeCardToken({
      paymentId: payment.id,
      tokenId,
      authenticationId:
        typeof authenticationId === "string" ? authenticationId : null,
    });

    if (!result.ok) {
      /* A decline is the customer's card saying no, not a fault of ours. It
         comes back as a plain message they can act on, and the charge row keeps
         its own record of why. */
      return fail(
        result.code === "NOT_FOUND" ? "NOT_FOUND" : "VALIDATION",
        result.message,
      );
    }

    /* Confirm here rather than waiting for the webhook. Xendit sends one too
       and `settlePayment` is idempotent, so whichever arrives first wins and
       the other changes nothing — but the customer is watching this request,
       and making them wait on a webhook for news they already have would be a
       spinner for no reason. */
    /* What actually arrived, read back from the row the charge just wrote —
       not the amount we asked for. The two agree today, but a partial capture
       would make them differ, and the booking should record the money it got. */
    const settled = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: { amountPaidIdr: true },
    });

    const confirmed = await markBookingPaid({
      bookingId,
      amountPaidIdr: settled?.amountPaidIdr ?? 0,
      by: "customer",
    });

    if (confirmed.ok) {
      await queueBookingCreated(bookingId);
      after(() => dispatchPending());
    }

    return ok({ status: "PAID" });
  } catch (error) {
    console.error("[booking] card charge failed", error);
    return serverError("We could not complete that payment.");
  }
}
