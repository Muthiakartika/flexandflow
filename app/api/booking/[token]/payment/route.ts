/**
 * `/api/booking/[token]/payment` — what the payment modal talks to.
 *
 * `GET` is the poll. It answers from our own database and nothing else: the
 * modal asks every few seconds whether the money has arrived, and the only
 * thing that ever writes that answer is the gateway callback. Proxying Xendit
 * from here would put a third party in the path of a request the customer's
 * browser makes twenty times a minute, and would let the browser's opinion of
 * its own payment reach a decision — PAYMENT-PLAN.md §4 and §11 risk 11.
 *
 * `POST` opens a second charge on a different rail, for the customer whose QR
 * expired or who decided halfway through that a bank transfer would be easier.
 * It is not a way to pay twice: it is refused unless the booking is still an
 * unexpired hold.
 *
 * The token is the same HMAC the manage link carries, checked before the
 * database is touched, and a bad one is answered exactly like a booking that
 * does not exist.
 */
import { addMinutes } from "date-fns";

import { BookingStatus } from "@/generated/prisma/enums";
import { fail, ok, serverError } from "@/lib/api/respond";
import { fieldErrors, startPaymentSchema } from "@/lib/booking/schema";
import { formatStudioDate } from "@/lib/booking/time";
import { readManageToken } from "@/lib/booking/tokens";
import { prisma } from "@/lib/db";
import { env, paymentsEnabled } from "@/lib/env";
import { createCharge } from "@/lib/payments/charges";
import {
  PAYMENT_HOLD_MAX_MINUTES,
  PAYMENT_HOLD_MINUTES,
} from "@/lib/booking/create";
import type { PaymentStatusView } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

const NOT_FOUND_MESSAGE = "We could not find that booking.";

/* Both handlers query directly rather than through `loadBookingByToken`, for
   two reasons and the second is the one that matters. `LoadedBooking` does not
   carry `holdExpiresAt` or `amountDueIdr` — that loader exists to render a
   booking to a customer, and neither of those is something a customer is shown
   — so this route would have to ask for them separately anyway. And it joins
   the customer, the therapist, the variant and its service every time, which is
   the right shape for a confirmation email and the wrong one for a request the
   modal repeats every three seconds while somebody pays. */

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  const bookingId = readManageToken(token);

  if (!bookingId) {
    return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        reference: true,
        /* Most recent first: a customer who let one charge expire and opened
           another is asking about the second one. */
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            channel: true,
            amountIdr: true,
            amountPaidIdr: true,
            expiresAt: true,
            paidAt: true,
          },
        },
      },
    });

    if (!booking) {
      return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
    }

    const payment = booking.payments[0];

    if (!payment) {
      return fail("NOT_FOUND", "No payment has been started for that booking.");
    }

    const view: PaymentStatusView = {
      paymentId: payment.id,
      status: payment.status,
      channel: payment.channel,
      amountIdr: payment.amountIdr,
      amountPaidIdr: payment.amountPaidIdr,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      paidAt: payment.paidAt?.toISOString() ?? null,
      /* Both, so the modal can decide to close and where to send the customer
         without a second request. */
      bookingStatus: booking.status,
      bookingReference: booking.reference,
    };

    return ok(view);
  } catch (error) {
    console.error("[booking] GET /api/booking/[token]/payment failed", error);
    return serverError("We could not check that payment. Please try again.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  const bookingId = readManageToken(token);

  if (!bookingId) {
    return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return fail("VALIDATION", "That request body was not valid JSON.");
  }

  const parsed = startPaymentSchema.safeParse(raw);

  if (!parsed.success) {
    return fail("VALIDATION", "Please choose how you would like to pay.", {
      fields: fieldErrors(parsed.error),
    });
  }

  if (!paymentsEnabled()) {
    return fail(
      "VALIDATION",
      "Online payment is not available at the moment. Please message the " +
        "studio on WhatsApp.",
    );
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        reference: true,
        status: true,
        startAt: true,
        holdExpiresAt: true,
        createdAt: true,
        /* The amount owed, settled when the booking was written and read from
           the catalogue even then. A second charge cannot be for a different
           number than the first, whatever the body says. */
        amountDueIdr: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneE164: true,
          },
        },
        variant: { select: { service: { select: { title: true } } } },
      },
    });

    if (!booking) {
      return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return fail(
        "ALREADY_CANCELLED",
        "That booking has been cancelled. Please book again.",
      );
    }

    /*
     * Anything else — already confirmed, completed, a no-show — is a booking
     * with no charge to open. A confirmed one is the case worth being firm
     * about: it is already paid for, and a second charge would take the money
     * twice.
     */
    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      return fail(
        "VALIDATION",
        "That booking is not waiting for payment. Please message the studio " +
          "on WhatsApp if something looks wrong.",
      );
    }

    /*
     * The hold is what reserves the slot, so a charge opened after it lapsed
     * would be collecting money for a time somebody else may already have.
     * `CUTOFF_PASSED` for the same reason the transitions file uses it: nothing
     * about the request was wrong, the window simply closed. The cron will
     * cancel the booking on its next pass.
     */
    if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= Date.now()) {
      return fail(
        "CUTOFF_PASSED",
        "That slot is no longer being held. Please choose a time again.",
      );
    }

    /*
     * Give the replacement charge room to be paid.
     *
     * A charge lapses at `XENDIT_INVOICE_MINUTES` (13) and the hold at 15, so
     * a customer whose QRIS code expired had about two minutes to switch to a
     * bank transfer before losing the slot as well — long enough to fail, not
     * long enough to succeed. The hold moves out with each new charge, but
     * never past `PAYMENT_HOLD_MAX_MINUTES` from when the booking was made:
     * without that ceiling, reopening charges would be a way to hold a
     * Saturday morning all afternoon without paying for it.
     */
    const ceiling = addMinutes(booking.createdAt, PAYMENT_HOLD_MAX_MINUTES);
    const wanted = addMinutes(new Date(), PAYMENT_HOLD_MINUTES);
    const extended = wanted.getTime() < ceiling.getTime() ? wanted : ceiling;

    if (
      booking.holdExpiresAt &&
      extended.getTime() > booking.holdExpiresAt.getTime()
    ) {
      /* Conditioned on the status, so a booking the cron cancelled between the
         read above and this write does not have its hold quietly restored. */
      await prisma.booking.updateMany({
        where: { id: booking.id, status: BookingStatus.AWAITING_PAYMENT },
        data: { holdExpiresAt: extended },
      });
    }

    const intent = await createCharge({
      bookingId: booking.id,
      amountIdr: booking.amountDueIdr,
      channel: parsed.data.channel,
      description: `Flex & Flow — ${booking.variant.service.title}, ${formatStudioDate(booking.startAt)}`,
      customer: booking.customer,
      bookingReference: booking.reference,
      returnUrl: `${env().NEXT_PUBLIC_SITE_URL}/booking/confirmation/${booking.reference}/`,
    });

    return ok({ payment: intent });
  } catch (error) {
    console.error("[booking] POST /api/booking/[token]/payment failed", error);
    return serverError("We could not start that payment. Please try again.");
  }
}
