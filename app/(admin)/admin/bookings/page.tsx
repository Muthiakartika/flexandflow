import type { Metadata } from "next";
import Link from "next/link";

import { BookingFilters } from "@/components/admin/BookingFilters";
import { PaymentChip } from "@/components/admin/PaymentPanel";
import {
  Empty,
  PageHeading,
  Panel,
  StatusChip,
  TableBox,
} from "@/components/admin/primitives";
import { requireAdmin } from "@/lib/admin/auth";
import {
  BOOKINGS_PAGE_SIZE,
  listBookings,
  listTherapistOptions,
  PAYMENT_FILTERS,
  type BookingFilters as Filters,
  type PaymentFilterValue,
} from "@/lib/admin/queries";
import {
  formatIdr,
  formatPhoneDisplay,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import { formatStudioDateShort, formatStudioTime, isIsoDate } from "@/lib/booking/time";
import type { BookingStatusValue } from "@/lib/booking/types";

export const metadata: Metadata = {
  title: "Bookings",
};

const STATUS_VALUES: BookingStatusValue[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

type Search = Record<string, string | string[] | undefined>;

function one(params: Search, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Everything from the query string is treated as hostile until it parses.
 * Anything unrecognised becomes "no filter" rather than an error page — a
 * mistyped date in a shared link should show the unfiltered list, not a stack
 * trace.
 */
function readFilters(params: Search): Filters {
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

/** The same filters, carried onto the next page link. */
function pageHref(filters: Filters, page: number): string {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.therapistId) query.set("therapistId", filters.therapistId);
  if (filters.status) query.set("status", filters.status);
  if (filters.payment) query.set("payment", filters.payment);
  if (page > 1) query.set("page", String(page));

  const search = query.toString();
  return search ? `/admin/bookings/?${search}` : "/admin/bookings/";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();

  const filters = readFilters(await searchParams);
  const [result, therapists] = await Promise.all([
    listBookings(filters),
    listTherapistOptions(),
  ]);

  const first = (result.page - 1) * BOOKINGS_PAGE_SIZE + 1;
  const last = Math.min(result.page * BOOKINGS_PAGE_SIZE, result.total);

  return (
    <>
      <PageHeading
        title="Bookings"
        lede="Newest first. Dates are studio days in Bali time."
      />

      <Panel>
        <BookingFilters filters={filters} therapists={therapists} />
      </Panel>

      <Panel
        title={
          result.total === 0
            ? "No matches"
            : `${result.total} booking${result.total === 1 ? "" : "s"}`
        }
        description={
          result.total === 0
            ? undefined
            : `Showing ${first}–${last}, page ${result.page} of ${result.pageCount}.`
        }
      >
        {result.bookings.length === 0 ? (
          <Empty>Nothing matches those filters.</Empty>
        ) : (
          <TableBox>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Service</th>
                  <th scope="col">Therapist</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Price</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.bookings.map((booking) => {
                  const start = new Date(booking.startAt);
                  return (
                    <tr key={booking.id}>
                      <td className="whitespace-nowrap">
                        {formatStudioDateShort(start)}
                        <span className="block text-[12px] font-bold text-ink">
                          {formatStudioTime(start)}
                        </span>
                      </td>
                      <td className="font-bold whitespace-nowrap">
                        {booking.reference}
                      </td>
                      <td>{booking.serviceTitle}</td>
                      <td className="whitespace-nowrap">
                        {booking.therapistName}
                      </td>
                      <td>
                        {fullName(
                          booking.customer.firstName,
                          booking.customer.lastName,
                        )}
                        <a
                          href={whatsappLink(booking.customer.phoneE164)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[12px] font-bold text-olive-strong underline underline-offset-2"
                        >
                          {formatPhoneDisplay(booking.customer.phoneE164)}
                        </a>
                      </td>
                      <td className="whitespace-nowrap">
                        {formatIdr(booking.priceIdr)}
                      </td>
                      <td>
                        <PaymentChip state={booking.payment} />
                        {/* Only when it disagrees with the chip: a part-paid
                            deposit or a part-refund is the case where the
                            single word is not the whole answer. */}
                        {booking.paidIdr > 0 &&
                        booking.paidIdr < booking.priceIdr ? (
                          <span className="mt-1 block text-[12px] whitespace-nowrap text-faint">
                            {formatIdr(booking.paidIdr)} in
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <StatusChip status={booking.status} />
                      </td>
                      <td>
                        <Link
                          href={`/admin/bookings/${booking.id}/`}
                          className="text-[13px] font-bold text-olive-strong underline underline-offset-2"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableBox>
        )}

        {result.pageCount > 1 ? (
          <nav
            aria-label="Booking pages"
            className="mt-4 flex items-center justify-between gap-3"
          >
            {result.page > 1 ? (
              <Link
                href={pageHref(filters, result.page - 1)}
                className="admin-btn admin-btn-quiet"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <p className="text-[13px] text-faint">
              Page {result.page} of {result.pageCount}
            </p>
            {result.page < result.pageCount ? (
              <Link
                href={pageHref(filters, result.page + 1)}
                className="admin-btn admin-btn-quiet"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
