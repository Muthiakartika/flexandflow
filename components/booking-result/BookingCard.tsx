import type { ReactNode } from "react";

import StatusBadge from "@/components/booking-result/StatusBadge";
import { CARD, H3 } from "@/components/ui/tokens";
import {
  formatDuration,
  formatIdr,
  formatPhoneDisplay,
  fullName,
} from "@/lib/booking/format";
import { formatStudioDate } from "@/lib/booking/time";
import { TIER_LABEL, type BookingView } from "@/lib/booking/types";

/**
 * The booking, written out once.
 *
 * The confirmation page and the manage page show the same appointment and must
 * not describe it in two different ways — every figure here comes from
 * `BookingView`, which already carries the studio-local date and time strings.
 * Nothing on this card recomputes a time: the studio is UTC+8 and the server is
 * UTC, so any arithmetic done here would be eight hours out and look correct in
 * testing. See `lib/booking/time.ts`.
 *
 * No `"use client"`: it is rendered from a server page and from inside the
 * cancel flow, which needs to swap it for the cancelled state without a reload.
 */
export default function BookingCard({ booking }: { booking: BookingView }) {
  const cancelled = booking.status === "CANCELLED";
  const customerName = fullName(
    booking.customer.firstName,
    booking.customer.lastName,
  );

  /* Struck through rather than removed: the person still needs to see which
     session this was in order to recognise it. */
  const value = (text: string, struck = false) => (
    <span className={struck ? "line-through decoration-secondary/45" : ""}>
      {text}
    </span>
  );

  const rows: { term: string; detail: ReactNode }[] = [
    { term: "Reference", detail: booking.reference },
    { term: "Date", detail: value(booking.dateLabel, cancelled) },
    { term: "Time", detail: value(`${booking.timeLabel} (WITA)`, cancelled) },
    { term: "Length", detail: formatDuration(booking.durationMinutes) },
    {
      term: "Therapist",
      detail: `${booking.therapistDisplayName} · ${TIER_LABEL[booking.tier]}`,
    },
    { term: "Price", detail: formatIdr(booking.priceIdr) },
    { term: "Booked for", detail: customerName },
    { term: "Phone", detail: formatPhoneDisplay(booking.customer.phoneE164) },
  ];

  if (booking.customer.email) {
    rows.push({ term: "Email", detail: booking.customer.email });
  }

  if (booking.customer.note) {
    rows.push({ term: "Your note", detail: booking.customer.note });
  }

  return (
    <article
      className={`overflow-hidden ${CARD} ${cancelled ? "border-secondary/30" : ""}`}
    >
      {/* A cancelled booking is not a confirmed one with a grey word added: the
          card is topped by a filled band so the state is unmistakable before
          any of the detail is read. */}
      {cancelled ? (
        <div className="bg-secondary px-5 py-4 text-white">
          <p className="font-body text-[15px] leading-[1.5] font-bold">
            This booking is cancelled.
          </p>
          <p className="mt-1 font-body text-[14px] leading-[1.5] text-white/80">
            {booking.cancelledAt
              ? `Cancelled on ${formatStudioDate(new Date(booking.cancelledAt))}. `
              : ""}
            The time below is no longer held for you.
          </p>
          {booking.cancelReason ? (
            <p className="mt-2 font-body text-[14px] leading-[1.5] text-white/80">
              Reason given: {booking.cancelReason}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <h2 className={`${H3} ${cancelled ? "text-body-text/65" : ""}`}>
            {booking.serviceTitle}
          </h2>
          <StatusBadge status={booking.status} />
        </div>

        <dl className={`mt-4 ${cancelled ? "text-body-text/65" : ""}`}>
          {rows.map((row) => (
            <div
              key={row.term}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-secondary/10 py-2.5"
            >
              <dt className="page-label">{row.term}</dt>
              <dd className="font-body text-[15px] leading-[1.5] sm:text-right">
                {row.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
