import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PaymentChip } from "@/components/admin/PaymentPanel";
import {
  Empty,
  PageHeading,
  Panel,
  Stat,
  StatusChip,
  TableBox,
} from "@/components/admin/primitives";
import { WahaBanner } from "@/components/admin/WahaBanner";
import ContentOverview from "@/components/cms/ContentOverview";
import { can, requireAdmin } from "@/lib/admin/auth";
import { dayExportHref } from "@/lib/admin/filters";
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
 * One money figure in the strip under the stats.
 *
 * The label carries its own scope. These are not one set of numbers split
 * three ways — two of them are today and one of them is everything after it.
 */
function Money({
  label,
  value,
  hint,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.06em] text-faint uppercase">
        {label}
      </p>
      <p className={`mt-1 text-[20px] leading-none font-bold ${tone}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-faint">{hint}</p> : null}
    </div>
  );
}

/**
 * The page the studio opens at eight in the morning.
 *
 * Everything on it answers a question somebody is about to ask out loud: who
 * is coming, when, to whom, what did they pay, did they say anything, and can
 * I message them right now. The phone number is a `wa.me` link because the
 * answer to "they are late" is always a WhatsApp, and retyping a number off a
 * screen is how you message the wrong person.
 *
 * Every figure above the table is one studio day wide, and the page says so in
 * as many words. It has to: on a day with nothing booked the whole top of the
 * page reads zero while the bookings list shows a booking that is paid for,
 * and without the labels that looks like money the panel has lost rather than
 * money for next Tuesday.
 */

/**
 * What `/admin/` shows to somebody who cannot see bookings.
 *
 * This route is the panel's home and the place `requirePermission` sends
 * anyone who reaches a section they do not have, so it must render for every
 * admin — but the agenda below it is a list of customer names, phone numbers
 * and what they paid, which a content editor has no reason to read.
 */
async function ContentOnlyHome({
  name,
  showContent,
}: {
  name: string;
  showContent: boolean;
}) {
  return (
    <>
      <PageHeading title={`Hello, ${name}`} lede="Flex & Flow admin" />
      {showContent ? (
        <Suspense fallback={null}>
          <ContentOverview />
        </Suspense>
      ) : (
        <Panel title="Your sections">
          <p className="text-[14px] text-muted">
            Your account does not include bookings or website content. Use the
            sidebar to reach the sections you do have.
          </p>
        </Panel>
      )}
    </>
  );
}

export default async function AdminAgendaPage() {
  const admin = await requireAdmin();

  if (!can(admin, "booking.manage")) {
    return (
      <ContentOnlyHome
        name={admin.name}
        showContent={can(admin, "content.view")}
      />
    );
  }

  const agenda = await loadAgenda();
  const today = studioDayStart(agenda.date);
  const tomorrow = studioDayStart(agenda.tomorrow);
  const { ahead } = agenda;
  const aheadLabel = `${ahead.count} session${ahead.count === 1 ? "" : "s"}`;

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
        actions={
          /* Today only, matching the table below it. Any other range is a
             download off the bookings page, where the filters live. */
          <a
            href={dayExportHref(agenda.date)}
            className="admin-btn admin-btn-quiet"
            download
          >
            Download today (CSV)
          </a>
        }
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

      {/* The same money, split by where it is. One number cannot answer both
          "how much did we take today?" and "how much has the desk still got to
          ask for?", and it is the second one somebody needs at closing time.
          The third is neither: it is what has already been collected for
          sessions that have not happened yet, and it is here because leaving
          it off is what made this page look like it disagreed with the
          bookings list. */}
      <div className="admin-card mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
        <Money
          label="Paid online · today"
          value={formatIdr(agenda.paidOnlineIdr)}
          tone="text-ok"
        />
        <Money
          label="Due at the studio · today"
          value={formatIdr(agenda.dueAtStudioIdr)}
        />
        <Money
          label="Paid online · after today"
          value={formatIdr(ahead.paidOnlineIdr)}
          tone="text-ok"
          hint={
            ahead.count === 0
              ? "Nothing booked ahead"
              : ahead.nextDate
                ? `${aheadLabel} booked ahead, next ${formatStudioDateShort(
                    studioDayStart(ahead.nextDate),
                  )}`
                : `${aheadLabel} booked ahead`
          }
        />
        <p className="max-w-[34ch] text-[12px] text-faint">
          The first two are today only. Cancellations and no-shows are
          excluded, and anything refunded has already been taken back off.
        </p>
      </div>

      <Panel title="Today's sessions">
        {agenda.bookings.length === 0 ? (
          /* Where the bookings actually are. A bare "nothing booked" on a page
             of zeroes reads as a panel that has stopped seeing the diary. */
          <Empty>
            Nothing booked for today.
            {ahead.nextDate ? (
              <>
                {" "}
                Next session{" "}
                <Link
                  href={`/admin/bookings/?from=${ahead.nextDate}`}
                  className="font-bold text-olive-strong underline underline-offset-2"
                >
                  {formatStudioDateShort(studioDayStart(ahead.nextDate))}
                </Link>
                {`, ${aheadLabel} booked ahead.`}
              </>
            ) : null}
          </Empty>
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
                  <th scope="col">Payment</th>
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
                      {/* So the person at the desk knows, before the customer
                          reaches it, who still owes money. */}
                      <PaymentChip state={booking.payment} />
                      {booking.priceIdr > booking.paidIdr &&
                      booking.paidIdr > 0 ? (
                        <span className="mt-1 block text-[12px] whitespace-nowrap text-faint">
                          {formatIdr(booking.priceIdr - booking.paidIdr)} to
                          collect
                        </span>
                      ) : null}
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
