import { isApiError, type ApiError, type BookingView } from "@/lib/booking/types";

/**
 * What the customer is told when a booking action is refused.
 *
 * The API answers with a machine-readable `code` precisely so these pages do
 * not have to print a server sentence at somebody who is trying to cancel a
 * massage. Four of the codes mean something specific has happened to *this*
 * booking and each needs its own reply; the rest are variations on "not now".
 */
export function messageForError(payload: unknown): string {
  if (!isApiError(payload)) return FALLBACK;

  switch (payload.code) {
    case "CUTOFF_PASSED":
      return "It is now too close to the session to change it here. Message the studio on WhatsApp and we will sort it out with you.";
    case "ALREADY_CANCELLED":
      return "This booking has already been cancelled — there is nothing left to cancel.";
    case "SLOT_TAKEN":
      return "That time was taken while you were choosing it. Pick another slot and try again.";
    case "NOT_FOUND":
      return "We could not find this booking. The link may have expired, or the booking may have been removed.";
    case "RATE_LIMITED":
      return "Too many attempts in a row. Wait a minute and try again.";
    default:
      return payload.error || FALLBACK;
  }
}

const FALLBACK =
  "Something went wrong at our end and the booking was not changed. Try again, or message the studio on WhatsApp.";

/** Codes whose meaning is that the page is now out of date. */
export function isStaleCode(payload: unknown): boolean {
  if (!isApiError(payload)) return false;
  const stale: ApiError["code"][] = [
    "CUTOFF_PASSED",
    "ALREADY_CANCELLED",
    "NOT_FOUND",
  ];
  return stale.includes(payload.code);
}

/**
 * A cheap shape check on the success body. The endpoints return a `BookingView`
 * and nothing else, but the page swaps its whole state on the strength of it,
 * so it is worth one look rather than a bare cast.
 */
function looksLikeBookingView(value: unknown): value is BookingView {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<BookingView>;
  return (
    typeof candidate.reference === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.dateLabel === "string"
  );
}

/**
 * The booking out of a successful response, or null.
 *
 * Every booking endpoint answers `{ booking: … }` rather than the booking on
 * its own, so that a later addition to the payload does not change the shape of
 * what is already there. The bare form is accepted too — it costs one line and
 * means a client and a route disagreeing about the envelope degrades to a
 * working page rather than a generic error.
 */
export function readBookingView(value: unknown): BookingView | null {
  if (typeof value === "object" && value !== null && "booking" in value) {
    const inner = (value as { booking: unknown }).booking;
    return looksLikeBookingView(inner) ? inner : null;
  }
  return looksLikeBookingView(value) ? value : null;
}

export { FALLBACK as GENERIC_ERROR };
