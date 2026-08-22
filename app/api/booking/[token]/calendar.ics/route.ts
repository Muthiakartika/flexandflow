/**
 * `GET /api/booking/[token]/calendar.ics` — the file that puts the appointment
 * in the customer's phone.
 *
 * Served rather than generated in the browser because the same URL is what the
 * confirmation email links to and what the manage page offers, and because the
 * `SEQUENCE` it has to carry only exists in the database.
 *
 * A cancelled booking still answers, with `METHOD:CANCEL`. That is not an
 * oversight: a customer who taps the link in the cancellation email needs the
 * file that *removes* the event, and returning a 404 would leave the
 * appointment sitting in their calendar for ever.
 */
import { fail, serverError } from "@/lib/api/respond";
import { loadBookingByToken, manageUrlFor, toBookingSummary } from "@/lib/booking/view";
import { bookingIcs, icsFilename } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;

  try {
    const booking = await loadBookingByToken(token);

    /* A forged signature and a booking that never existed get the same answer;
       see the note in the sibling `route.ts`. */
    if (!booking) {
      return fail("NOT_FOUND", "We could not find that booking.");
    }

    const summary = toBookingSummary(booking);

    const body = bookingIcs(summary, {
      method: booking.status === "CANCELLED" ? "CANCEL" : "PUBLISH",
      sequence: booking.icsSequence,
      manageUrl: manageUrlFor(booking.manageToken),
    });

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        /* `attachment` rather than `inline`: a phone that is shown this as a
           download hands it to the calendar app, where a rendered text file
           would just be a screen of unreadable VEVENT lines. */
        "content-disposition": `attachment; filename="${icsFilename(summary)}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[booking] GET calendar.ics failed", error);
    return serverError("We could not build that calendar file.");
  }
}
