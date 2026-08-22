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
 */
import { after } from "next/server";

import { fail, ok, serverError } from "@/lib/api/respond";
import { createBooking } from "@/lib/booking/create";
import { guardBookingRequest, recordBookingOrigin } from "@/lib/booking/guard";
import { createBookingSchema, fieldErrors } from "@/lib/booking/schema";
import { toBookingView } from "@/lib/booking/view";
import { dispatchPending, queueBookingCreated } from "@/lib/notifications";

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

    const view = toBookingView(booking);

    return ok({ booking: view, reference: view.reference }, { status: 201 });
  } catch (error) {
    console.error("[booking] POST /api/booking failed", error);
    return serverError();
  }
}
