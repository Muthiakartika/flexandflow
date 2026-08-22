/**
 * `POST /api/booking/[token]/reschedule` — the customer moves their own booking.
 *
 * Like cancel, the actor is fixed to `"customer"`: whoever holds the link is
 * not an administrator and does not get the exemption from the cutoff. The new
 * time is re-resolved against the catalogue in `rescheduleBooking`, so the body
 * only has to carry a start instant and, optionally, a different therapist.
 */
import { after } from "next/server";

import { fail, ok, serverError } from "@/lib/api/respond";
import { fieldErrors, rescheduleBookingSchema } from "@/lib/booking/schema";
import { rescheduleBooking } from "@/lib/booking/transitions";
import { loadBookingByToken, toBookingView } from "@/lib/booking/view";
import { dispatchPending, queueBookingRescheduled } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;

  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return fail("VALIDATION", "That request body was not valid JSON.");
  }

  const parsed = rescheduleBookingSchema.safeParse(raw);

  if (!parsed.success) {
    return fail("VALIDATION", "Please choose a new time.", {
      fields: fieldErrors(parsed.error),
    });
  }

  try {
    const existing = await loadBookingByToken(token);

    if (!existing) {
      return fail("NOT_FOUND", "We could not find that booking.");
    }

    const result = await rescheduleBooking({
      bookingId: existing.id,
      startAt: new Date(parsed.data.startAt),
      staff: parsed.data.staff,
      by: "customer",
    });

    if (!result.ok) {
      return fail(result.code, result.message);
    }

    try {
      await queueBookingRescheduled(result.booking.id);
    } catch (error) {
      console.error("[booking] could not queue reschedule notices", error);
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
    console.error(
      "[booking] POST /api/booking/[token]/reschedule failed",
      error,
    );
    return serverError("We could not move that booking. Please try again.");
  }
}
