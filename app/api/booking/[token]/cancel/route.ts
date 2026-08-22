/**
 * `POST /api/booking/[token]/cancel` — the customer cancels their own booking.
 *
 * The actor is hard-coded to `"customer"`. This route is reachable by anyone
 * holding the link from the confirmation email, so it must never be able to
 * claim the admin exemption from the cancellation cutoff. Admin cancellations
 * go through the admin panel, which authenticates first.
 */
import { after } from "next/server";

import { fail, ok, serverError } from "@/lib/api/respond";
import { cancelBookingSchema, fieldErrors } from "@/lib/booking/schema";
import { cancelBooking } from "@/lib/booking/transitions";
import { loadBookingByToken, toBookingView } from "@/lib/booking/view";
import { dispatchPending, queueBookingCancelled } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;

  /* An empty body is a valid cancellation — the reason field is optional and
     most people leave it blank. */
  let raw: unknown = {};

  try {
    const text = await request.text();
    if (text.trim().length > 0) raw = JSON.parse(text);
  } catch {
    return fail("VALIDATION", "That request body was not valid JSON.");
  }

  const parsed = cancelBookingSchema.safeParse(raw);

  if (!parsed.success) {
    return fail("VALIDATION", "Please check the details you entered.", {
      fields: fieldErrors(parsed.error),
    });
  }

  try {
    const existing = await loadBookingByToken(token);

    if (!existing) {
      return fail("NOT_FOUND", "We could not find that booking.");
    }

    const result = await cancelBooking({
      bookingId: existing.id,
      by: "customer",
      reason: parsed.data.reason,
    });

    if (!result.ok) {
      return fail(result.code, result.message);
    }

    /* Same shape as creation: queue now, send after the response. The studio
       needs to know a slot has just freed up, but not at the cost of making
       the customer wait for WhatsApp. */
    try {
      await queueBookingCancelled(result.booking.id);
    } catch (error) {
      console.error("[booking] could not queue cancellation notices", error);
    }

    after(async () => {
      try {
        await dispatchPending();
      } catch (error) {
        console.error("[booking] deferred dispatch failed", error);
      }
    });

    return ok({ booking: toBookingView(result.booking) });
  } catch (error) {
    console.error("[booking] POST /api/booking/[token]/cancel failed", error);
    return serverError("We could not cancel that booking. Please try again.");
  }
}
