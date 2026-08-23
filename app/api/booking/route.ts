/**
 * `POST /api/booking` — the only endpoint that writes a booking.
 *
 * The order matters and is the whole design (BOOKING-PLAN.md §6.1): validate,
 * guard, commit, *then* tell people. The customer's browser gets its answer as
 * soon as Postgres has the row. SendGrid and the studio's WAHA server are
 * spoken to after the response has already gone out, in `after()`, and if both
 * of them are down the booking still exists and the queue will retry it.
 *
 * Nothing that happens after the commit may fail this request.
 *
 * Since PAYMENT-PLAN.md §3 there are two paths out of here, and the difference
 * between them is the single most dangerous line in the payment feature.
 * Paying at the studio is unchanged: confirm, then tell everybody. Paying
 * online must tell *nobody* — the booking is only a hold, no money has moved,
 * and a confirmation email at this point would promise an appointment the
 * customer may never pay for. On that path the messages are queued by the
 * payment callback, once the money is actually in.
 */
import { after } from "next/server";

import { fail, ok, serverError } from "@/lib/api/respond";
import { createBooking } from "@/lib/booking/create";
import { guardBookingRequest, recordBookingOrigin } from "@/lib/booking/guard";
import { createBookingSchema, fieldErrors } from "@/lib/booking/schema";
import { expireBookingHold } from "@/lib/booking/transitions";
import { toBookingView } from "@/lib/booking/view";
import { env } from "@/lib/env";
import { dispatchPending, queueBookingCreated } from "@/lib/notifications";
import { createCharge } from "@/lib/payments/charges";
import type { PaymentIntent } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

/**
 * `after` runs inside this invocation's budget, so the send attempt needs room.
 * It is not holding the customer up — the response has already been written.
 */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return fail("VALIDATION", "That request body was not valid JSON.");
  }

  const parsed = createBookingSchema.safeParse(raw);

  if (!parsed.success) {
    return fail("VALIDATION", "Please check the details you entered.", {
      fields: fieldErrors(parsed.error),
    });
  }

  const payload = parsed.data;

  try {
    const guard = await guardBookingRequest({
      request,
      phoneE164: payload.customer.phoneE164,
      website: payload.website,
      turnstileToken: payload.turnstileToken,
    });

    if (!guard.ok) {
      return fail(guard.code, guard.message);
    }

    const result = await createBooking(payload);

    if (!result.ok) {
      return fail(result.code, result.message);
    }

    const booking = result.booking;

    /* Best-effort, and deliberately so: this is the audit trail and the ledger
       the IP rate limit counts, neither of which is worth failing a saved
       booking over. */
    await recordBookingOrigin({ bookingId: booking.id, ip: guard.ip });

    const view = toBookingView(booking);

    if (result.payment.method === "ONLINE") {
      let intent: PaymentIntent;

      try {
        intent = await createCharge({
          bookingId: booking.id,
          /* `createBooking` derived this from the catalogue and wrote it to
             `amountDueIdr`. The request body never had a say in it. */
          amountIdr: result.payment.amountIdr,
          channel: result.payment.channel,
          description: `Flex & Flow — ${view.serviceTitle}, ${view.dateLabel}`,
          customer: {
            firstName: booking.customer.firstName,
            lastName: booking.customer.lastName,
            email: booking.customer.email,
            phoneE164: booking.customer.phoneE164,
          },
          bookingReference: view.reference,
          /* Where the gateway sends someone who paid on its own hosted page.
             It only *shows* the outcome: the page reads the database, and the
             callback is what writes it — PAYMENT-PLAN.md §5 rule 1. */
          returnUrl: `${env().NEXT_PUBLIC_SITE_URL}/booking/confirmation/${view.reference}/`,
        });
      } catch (error) {
        console.error("[booking] could not open a charge", error);

        /*
         * The row is already committed, and it is holding a slot nobody can
         * now pay for. Left alone it would block that time until the cron
         * swept it fifteen minutes later, while the customer sits in front of
         * a modal that never opened. So the hold is released here and the
         * wizard is told to try again — the same booking, made cleanly, is a
         * better outcome than a zombie.
         *
         * `expireBookingHold` rather than `cancelBooking`: this booking was
         * never confirmed to anybody, so there is no calendar entry to revoke
         * and nothing to tell the customer they have lost.
         */
        try {
          await expireBookingHold({
            bookingId: booking.id,
            reason: "The charge could not be opened.",
          });
        } catch (cancelError) {
          /* Now it really is a zombie, but a visible one: it shows in the
             admin agenda as awaiting payment, and the hold sweep will still
             cancel it when `holdExpiresAt` passes. */
          console.error(
            "[booking] could not release the hold after a failed charge",
            cancelError,
          );
        }

        return fail(
          "SERVER",
          "We could not start the payment. Please try again, or choose to " +
            "pay at the studio.",
        );
      }

      /* No `queueBookingCreated` on this path, and no `dispatchPending`. See
         the note at the top of this file: nothing goes out until the callback
         says the money arrived. */
      return ok(
        { booking: view, reference: view.reference, payment: intent },
        { status: 201 },
      );
    }

    /*
     * Queued before the response, sent after it. Writing the job rows now means
     * that even if this function is killed the moment it returns, the cron
     * dispatcher still finds them and the customer still hears from us.
     */
    try {
      await queueBookingCreated(booking.id);
    } catch (error) {
      console.error("[booking] could not queue notifications", error);
    }

    after(async () => {
      try {
        await dispatchPending();
      } catch (error) {
        /* A logged-out WAHA session must never be visible to the customer.
           The jobs stay PENDING and /api/cron/dispatch retries them. */
        console.error("[booking] deferred dispatch failed", error);
      }
    });

    return ok({ booking: view, reference: view.reference }, { status: 201 });
  } catch (error) {
    console.error("[booking] POST /api/booking failed", error);
    return serverError();
  }
}
