import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  Empty,
  PageHeading,
  Panel,
  Stat,
  StatusChip,
  TableBox,
} from "@/components/admin/primitives";
import { WahaBanner } from "@/components/admin/WahaBanner";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAgenda } from "@/lib/admin/queries";
import {
  formatDuration,
  formatIdr,
  formatPhoneDisplay,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import {
  formatStudioDate,
  formatStudioDateShort,
  formatStudioTime,
  studioDayStart,
} from "@/lib/booking/time";

export const metadata: Metadata = {
  title: "Today",
};

/**
 * The page the studio opens at eight in the morning.
 *
 * Everything on it answers a question somebody is about to ask out loud: who
 * is coming, when, to whom, what did they pay, did they say anything, and can
 * I message them right now. The phone number is a `wa.me` link because the
 * answer to "they are late" is always a WhatsApp, and retyping a number off a
 * screen is how you message the wrong person.
 */
export default async function AdminAgendaPage() {
  await requireAdmin();

  const agenda = await loadAgenda();
  const today = studioDayStart(agenda.date);
  const tomorrow = studioDayStart(agenda.tomorrow);

  return (
    <>
      {/* Suspended so a WAHA server that is slow — or down, which is exactly
          when this matters — cannot hold up the agenda behind it. */}
      <Suspense fallback={null}>
        <WahaBanner />
      </Suspense>

      <PageHeading
        title="Today"
        lede={`${formatStudioDate(today)} · Bali time (WITA)`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Sessions today"
          value={String(agenda.todayCount)}
          hint="Cancellations and no-shows excluded"
        />
        <Stat
          label="Tomorrow"
          value={String(agenda.tomorrowCount)}
          hint={formatStudioDateShort(tomorrow)}
        />
        <Stat
          label="Today's takings"
          value={formatIdr(agenda.todayValueIdr)}
          hint="At the price each was booked at"
        />
        <Stat
          label="On the sheet"
          value={String(agenda.bookings.length)}
          hint="Every row below, cancellations included"
        />
      </div>

      <Panel title="Today's sessions">
        {agenda.bookings.length === 0 ? (
          <Empty>Nothing booked for today.</Empty>
        ) : (
          <TableBox>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Service</th>
                  <th scope="col">Therapist</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col">Note</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {agenda.bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-bold whitespace-nowrap">
                      {formatStudioTime(new Date(booking.startAt))}
                      <span className="block text-[12px] font-normal text-faint">
                        {formatStudioTime(new Date(booking.endAt))}
                      </span>
                    </td>
                    <td>
                      {booking.serviceTitle}
                      <span className="block text-[12px] text-faint">
                        {formatDuration(booking.durationMinutes)}
                      </span>
                    </td>
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
                      <StatusChip status={booking.status} />
                    </td>
                    <td className="max-w-[260px] text-[13px] text-muted">
                      {booking.customer.note ?? "—"}
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
                ))}
              </tbody>
            </table>
          </TableBox>
        )}
      </Panel>
    </>
  );
}
