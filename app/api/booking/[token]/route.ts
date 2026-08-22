/**
 * `GET /api/booking/[token]` — the booking behind a manage link.
 *
 * The token is an HMAC over the booking id, so a bad signature is refused
 * before the database is touched. It is answered with `NOT_FOUND` rather than
 * anything more specific: a forged token and a cancelled-and-purged booking
 * should be indistinguishable from outside, or the endpoint becomes a way to
 * confirm that a given appointment exists.
 *
 * It answers with `BookingViewWithIds` rather than the plain view every other
 * booking endpoint returns: this is the request the reschedule wizard makes on
 * arriving from a manage link, and it cannot ask for open times without the
 * variant and therapist ids behind the booking.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { loadBookingByToken, toBookingViewWithIds } from "@/lib/booking/view";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;

  try {
    const booking = await loadBookingByToken(token);

    if (!booking) {
      return fail("NOT_FOUND", "We could not find that booking.");
    }

    return ok({ booking: toBookingViewWithIds(booking) });
  } catch (error) {
    console.error("[booking] GET /api/booking/[token] failed", error);
    return serverError("We could not load that booking. Please try again.");
  }
}
