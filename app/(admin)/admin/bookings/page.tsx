import type { Metadata } from "next";
import Link from "next/link";

import { BookingFilters } from "@/components/admin/BookingFilters";
import { DeleteBookingButton } from "@/components/admin/DeleteBookingButton";
import { PaymentChip } from "@/components/admin/PaymentPanel";
import { PendingLink } from "@/components/admin/PendingLink";
import {
  Empty,
  PageHeading,
  Panel,
  StatusChip,
  TableBox,
} from "@/components/admin/primitives";
import { requireAdmin } from "@/lib/admin/auth";
import {
  bookingExportHref,
  bookingFilterQuery,
  readBookingFilters,
  type SearchInput,
} from "@/lib/admin/filters";
import {
  BOOKINGS_PAGE_SIZE,
  listBookings,
  listTherapistOptions,
  type BookingFilters as Filters,
} from "@/lib/admin/queries";
import {
  formatIdr,
  formatPhoneDisplay,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import { formatStudioDateShort, formatStudioTime } from "@/lib/booking/time";

export const metadata: Metadata = {
  title: "Bookings",
};

/** The same filters, carried onto the next page link. */
function pageHref(filters: Filters, page: number): string {
  const query = bookingFilterQuery(filters);
  if (page > 1) query.set("page", String(page));

  const search = query.toString();
  return search ? `/admin/bookings/?${search}` : "/admin/bookings/";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchInput>;
}) {
  await requireAdmin();

  const filters = readBookingFilters(await searchParams);
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
        actions={
          /* A plain link, not a button: the file is a GET of whatever the
             filters currently say, so it can be right-clicked, bookmarked and
             sent to the accountant like any other URL. */
          <a
            href={bookingExportHref(filters)}
            className="admin-btn admin-btn-quiet"
            download
          >
            Download CSV
          </a>
        }
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
                  <th scope="col">Actions</th>
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
                        <div className="grid justify-items-start gap-1">
                          <Link
                            href={`/admin/bookings/${booking.id}/`}
                            className="text-[13px] font-bold text-olive-strong underline underline-offset-2"
                          >
                            Open
                          </Link>

                          {/* Only on rows that may go — cancelled bookings and
                              unpaid holds. Anything the studio has to account
                              for has no button at all rather than one that
                              refuses; see `deletable` in `lib/admin/queries`. */}
                          {booking.deletable ? (
                            <DeleteBookingButton
                              bookingId={booking.id}
                              reference={booking.reference}
                            />
                          ) : null}
                        </div>
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
            {/* `PendingLink` rather than `Link`: paging is a navigation to
                this same route, so `loading.tsx` has nothing new to swap in and
                the screen sits unchanged while the next page is fetched. The
                dot beside the label is the only thing that says it heard. */}
            {result.page > 1 ? (
              <PendingLink
                href={pageHref(filters, result.page - 1)}
                className="admin-btn admin-btn-quiet"
              >
                ← Newer
              </PendingLink>
            ) : (
              <span />
            )}
            <p className="text-[13px] text-faint">
              Page {result.page} of {result.pageCount}
            </p>
            {result.page < result.pageCount ? (
              <PendingLink
                href={pageHref(filters, result.page + 1)}
                className="admin-btn admin-btn-quiet"
              >
                Older →
              </PendingLink>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
