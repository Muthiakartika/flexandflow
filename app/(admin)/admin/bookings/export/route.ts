/**
 * The bookings list, as a file Excel opens.
 *
 * It answers the same query string as `/admin/bookings/` and reads it with the
 * same parser, so "download" means "this screen, as a spreadsheet" and never
 * anything else. There is no page parameter: an export that stopped at
 * twenty-five rows would be a trap, because nothing about the file would say
 * it had.
 *
 * It sits under `/admin/` rather than `/api/` on purpose — `proxy.ts` matches
 * `/admin/:path*`, so the gate that covers the panel covers this too, and a
 * customer list cannot end up one guessed URL away from the public internet.
 * `requireAdmin()` still runs, for the same reason every page calls it: the
 * proxy only proves the cookie was signed, not that the account still exists.
 *
 * Money columns are plain integers with no `IDR` and no thousands separators.
 * The point of the file is that somebody can total a column.
 */
import { requirePermission } from "@/lib/admin/auth";
import { csvResponse, toCsv, type CsvValue } from "@/lib/admin/csv";
import { readBookingFilters } from "@/lib/admin/filters";
import {
  BOOKING_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATE_LABEL,
} from "@/lib/admin/labels";
import {
  EXPORT_ROW_LIMIT,
  listBookingsForExport,
  type BookingExportRow,
} from "@/lib/admin/queries";
import { fullName } from "@/lib/booking/format";
import {
  formatMinuteOfDay,
  minuteOfDay,
  studioDateKey,
} from "@/lib/booking/time";
import type { BookingFilters } from "@/lib/admin/queries";

const HEADERS = [
  "Reference",
  "Date",
  "Start",
  "End",
  "Duration (mins)",
  "Service",
  "Therapist",
  "Tier",
  "Customer",
  "Phone",
  "Email",
  "Status",
  "Payment method",
  "Payment state",
  "Price IDR",
  "Paid IDR",
  "Refunded IDR",
  "Net paid IDR",
  "Balance IDR",
  "Note",
  "Booked at",
];

/** `2026-08-24 09:00`, studio time — the shape Excel reads back as a date. */
function studioStamp(instant: Date): string {
  return `${studioDateKey(instant)} ${formatMinuteOfDay(minuteOfDay(instant))}`;
}

function studioClock(instant: Date): string {
  return formatMinuteOfDay(minuteOfDay(instant));
}

function toRow(booking: BookingExportRow): CsvValue[] {
  const start = new Date(booking.startAt);

  return [
    booking.reference,
    studioDateKey(start),
    studioClock(start),
    /* The customer-facing end: `BookingSummary.endAt` already excludes the
       clean-down buffer, and the studio's own diary is the wrong place to
       start telling people their massage runs fifteen minutes longer. */
    studioClock(new Date(booking.endAt)),
    booking.durationMinutes,
    booking.serviceTitle,
    booking.therapistName,
    booking.tier,
    fullName(booking.customer.firstName, booking.customer.lastName),
    booking.customer.phoneE164,
    booking.customer.email,
    BOOKING_STATUS_LABEL[booking.status],
    PAYMENT_METHOD_LABEL[booking.method],
    PAYMENT_STATE_LABEL[booking.payment],
    booking.priceIdr,
    booking.paidGrossIdr,
    booking.refundedIdr,
    booking.paidIdr,
    /* Can be negative, and is left that way: somebody who overpaid is owed
       money, and rounding that to zero is how it stops being noticed. */
    booking.priceIdr - booking.paidIdr,
    booking.customer.note,
    studioStamp(new Date(booking.createdAt)),
  ];
}

/** Says what is in the file without anyone having to open it. */
function filenameFor(filters: BookingFilters, today: string): string {
  const range =
    filters.from && filters.to
      ? filters.from === filters.to
        ? filters.from
        : `${filters.from}-to-${filters.to}`
      : (filters.from ?? filters.to ?? `all-to-${today}`);

  return `flex-flow-bookings-${range}.csv`;
}

export async function GET(request: Request): Promise<Response> {
  await requirePermission("booking.manage");

  const filters = readBookingFilters(new URL(request.url).searchParams);

  /* One over the ceiling, so a full result set is distinguishable from one
     that was cut off. Truncating silently would hand somebody a spreadsheet
     that looks complete and is not. */
  const rows = await listBookingsForExport(filters, EXPORT_ROW_LIMIT + 1);

  if (rows.length > EXPORT_ROW_LIMIT) {
    return new Response(
      `That is more than ${EXPORT_ROW_LIMIT.toLocaleString("en-US")} bookings. ` +
        `Set a From and To date on the bookings page and download again — ` +
        `a month or a year at a time.`,
      { status: 413, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const body = toCsv(HEADERS, rows.map(toRow));

  return csvResponse(filenameFor(filters, studioDateKey(new Date())), body);
}
