/**
 * Reading the bookings list's filters out of a URL, and writing them back into
 * one.
 *
 * Shared because two things now answer the same query string: the list page,
 * and the CSV export it links to. If they parsed it separately they would
 * drift, and the failure would be silent and awful — a spreadsheet that
 * quietly covers a different month from the screen it was downloaded off.
 *
 * Everything here treats the query string as hostile until it parses. Anything
 * unrecognised becomes "no filter" rather than an error: a mistyped date in a
 * link somebody pasted into WhatsApp should show the unfiltered list, not a
 * stack trace.
 */
import { PAYMENT_FILTERS } from "@/lib/admin/queries";
import type {
  BookingFilters,
  PaymentFilterValue,
} from "@/lib/admin/queries";
import { isIsoDate, type IsoDate } from "@/lib/booking/time";
import type { BookingStatusValue } from "@/lib/booking/types";

const STATUS_VALUES: BookingStatusValue[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

/** A page's resolved `searchParams`, or a route handler's `URLSearchParams`. */
export type SearchInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

function one(params: SearchInput, key: string): string {
  if (params instanceof URLSearchParams) return params.get(key)?.trim() ?? "";
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

export function readBookingFilters(params: SearchInput): BookingFilters {
  const from = one(params, "from");
  const to = one(params, "to");
  const status = one(params, "status") as BookingStatusValue;
  const payment = one(params, "payment") as PaymentFilterValue;
  const page = Number.parseInt(one(params, "page"), 10);

  return {
    from: isIsoDate(from) ? from : null,
    to: isIsoDate(to) ? to : null,
    therapistId: one(params, "therapistId") || null,
    status: STATUS_VALUES.includes(status) ? status : null,
    payment: PAYMENT_FILTERS.includes(payment) ? payment : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * The filters as a query string. `page` is deliberately not included — it is
 * the one thing every consumer wants to set for itself, and an export has no
 * pages at all.
 */
export function bookingFilterQuery(
  filters: Pick<BookingFilters, "from" | "to" | "therapistId" | "status" | "payment">,
): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.therapistId) query.set("therapistId", filters.therapistId);
  if (filters.status) query.set("status", filters.status);
  if (filters.payment) query.set("payment", filters.payment);
  return query;
}

/** `/admin/bookings/export/?…` — the same view of the data, as a file. */
export function bookingExportHref(
  filters: Parameters<typeof bookingFilterQuery>[0],
): string {
  const search = bookingFilterQuery(filters).toString();
  return search
    ? `/admin/bookings/export/?${search}`
    : "/admin/bookings/export/";
}

/** The export of exactly one studio day, for the agenda's download button. */
export function dayExportHref(date: IsoDate): string {
  return bookingExportHref({
    from: date,
    to: date,
    therapistId: null,
    status: null,
    payment: null,
  });
}
