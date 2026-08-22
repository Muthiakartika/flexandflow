"use client";

import { cutoffWindow } from "@/components/booking-result/cutoff";
import { ButtonLink } from "@/components/ui/Button";
import { CARD, H3 } from "@/components/ui/tokens";
import { formatDuration } from "@/lib/booking/format";
import { formatMinuteOfDay12h, formatStudioDate } from "@/lib/booking/time";
import { TIER_LABEL, type Slot } from "@/lib/booking/types";
import { contact } from "@/lib/site";

import type { BookingDetail } from "./useBookingApi";

/**
 * The three panels a reschedule needs that a new booking does not.
 *
 * Somebody arriving here has followed a link out of an email, possibly weeks
 * after making the booking and possibly on a phone in a taxi. Before they are
 * shown a calendar they have to be able to see, without scrolling or guessing,
 * *which* appointment they are about to move — hence `RescheduleBanner`, which
 * sits above every step and states the reference, the treatment, the therapist
 * and the time it currently holds.
 *
 * Every time here is studio time and is either precomputed by the server
 * (`dateLabel`, `timeLabel`) or rendered through `lib/booking/time.ts`. None of
 * it is derived from the browser's own clock.
 */

/** A WhatsApp link that opens with the reference already in the message. */
export function whatsappAbout(reference: string): string {
  return `${contact.whatsapp}?text=${encodeURIComponent(
    `Hi Flex & Flow, this is about my booking ${reference}.`,
  )}`;
}

/**
 * The manage page for this booking, as a path.
 *
 * `manageUrl` is absolute because it is written into emails; followed from the
 * site itself it has to be relative, or a preview deployment hands people a
 * link back to production. The confirmation page does the same thing.
 */
export function managePath(booking: BookingDetail): string {
  try {
    return new URL(booking.manageUrl).pathname;
  } catch {
    return "/booking/";
  }
}

/**
 * Why this booking cannot be moved from here, or `null` when it can.
 *
 * The server refuses the same cases, and its refusal is what the visitor sees
 * if they somehow get as far as pressing Confirm. This is the earlier answer:
 * a booking that is already cancelled, already over, or inside the cutoff
 * should never be offered a picker in the first place.
 */
export function blockedReason(
  booking: BookingDetail,
  cutoffHours: number,
): string | null {
  if (booking.status === "CANCELLED") {
    return "That booking has already been cancelled.";
  }

  if (booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
    return "That session has already taken place.";
  }

  if (!booking.canReschedule) {
    return (
      `You can move a booking yourself ${cutoffWindow(cutoffHours)}. ` +
      `Your session is nearer than that, and the therapist's day is already ` +
      `built around it.`
    );
  }

  return null;
}

function Rows({ rows }: { rows: Array<{ term: string; detail: string }> }) {
  return (
    <dl className="grid gap-0">
      {rows.map((row) => (
        <div
          key={row.term}
          className="grid gap-1 border-t border-secondary/10 py-3 first:border-t-0 first:pt-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="page-label sm:pt-1">{row.term}</dt>
          <dd className="font-body text-[15px] leading-[1.6]">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function treatment(booking: BookingDetail): string {
  return `${booking.serviceTitle} · ${formatDuration(booking.durationMinutes)}`;
}

function therapist(booking: BookingDetail): string {
  return `${booking.therapistDisplayName} · ${TIER_LABEL[booking.tier]}`;
}

/** The new time, in the same words the confirmation will use. */
function slotLabel(slot: Slot): string {
  return (
    `${formatStudioDate(new Date(slot.startAt))}, ` +
    `${formatMinuteOfDay12h(slot.startMinute)} – ` +
    `${formatMinuteOfDay12h(slot.endMinute)} (WITA)`
  );
}

/** What is being moved. Shown above the steps, on every step. */
export function RescheduleBanner({
  booking,
  canPick,
}: {
  booking: BookingDetail;
  /** False once the booking can no longer be moved: there is nothing to pick. */
  canPick: boolean;
}) {
  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <p className="page-label">Moving this booking</p>

      <div className="mt-4">
        <Rows
          rows={[
            { term: "Reference", detail: booking.reference },
            { term: "Treatment", detail: treatment(booking) },
            { term: "Therapist", detail: therapist(booking) },
            {
              term: "Booked for",
              detail: `${booking.dateLabel}, ${booking.timeLabel} (WITA)`,
            },
          ]}
        />
      </div>

      {canPick ? (
        <p className="mt-4 font-body text-[14px] leading-[1.7] text-body-text/75">
          The treatment and the therapist stay as they are — only the time
          changes. Pick a new day and time below.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The dead end, stated once with a way out.
 *
 * Reached either because the booking already could not be moved when the link
 * was opened, or because the server refused the move. Either way the Confirm
 * button is gone rather than left there to fail again, and what replaces it is
 * a person.
 */
export function RescheduleBlocked({
  booking,
  message,
}: {
  booking: BookingDetail;
  message: string;
}) {
  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <h3 className={H3}>This booking cannot be moved here</h3>

      <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
        {message}
      </p>

      <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
        Message the studio and we will move it for you. Your reference is{" "}
        <span className="tabular-nums">{booking.reference}</span>.
      </p>

      <div className="mt-4">
        <ButtonLink
          href={whatsappAbout(booking.reference)}
          external
          variant="solid"
        >
          Ask on WhatsApp
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * The last step: the old time and the new one, side by side.
 *
 * No price and no total. Nothing about the booking changes except the two lines
 * shown here, and putting a figure on this screen would invite the reading that
 * moving a session costs something or re-quotes it. It does neither —
 * `rescheduleBooking` carries `priceIdrAtBooking` across untouched.
 */
export function RescheduleConfirm({
  booking,
  slot,
  cancelCutoffHours,
}: {
  booking: BookingDetail;
  slot: Slot;
  /** How many hours before the session it can still be moved again. */
  cancelCutoffHours: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className={`${CARD} p-5 sm:p-6`}>
        <Rows
          rows={[
            {
              term: "Currently",
              detail: `${booking.dateLabel}, ${booking.timeLabel} (WITA)`,
            },
            { term: "Moving to", detail: slotLabel(slot) },
          ]}
        />
      </div>

      <p className="font-body text-[14px] leading-[1.7] text-body-text/75">
        The reference, the treatment, the therapist and the price all stay the
        same. We will send you an updated confirmation, and you can move or
        cancel the session again {cutoffWindow(cancelCutoffHours)}.
      </p>
    </div>
  );
}
