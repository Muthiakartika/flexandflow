"use client";

import { useState } from "react";

import BookingCard from "@/components/booking-result/BookingCard";
import CancelBooking from "@/components/booking-result/CancelBooking";
import { cutoffWindow } from "@/components/booking-result/cutoff";
import { ButtonLink } from "@/components/ui/Button";
import { CARD, FOCUS, H3 } from "@/components/ui/tokens";
import type { BookingView } from "@/lib/booking/types";
import { bookingUrl, contact } from "@/lib/site";

/**
 * The manage page's live half.
 *
 * It owns one piece of state — the booking as it now stands — so that
 * cancelling replaces the card and withdraws the actions in the same breath.
 * Leaving "Move this booking" on screen beside a cancelled card would be worse
 * than a stale page: it invites a second request against a booking that no
 * longer exists.
 */
export default function ManageBooking({
  booking,
  token,
  cutoffHours,
}: {
  booking: BookingView;
  token: string;
  cutoffHours: number;
}) {
  const [cancelled, setCancelled] = useState<BookingView | null>(null);
  /* Server props win until this page has cancelled the booking itself, so a
     `router.refresh()` after a refused request still updates what is shown. */
  const current = cancelled ?? booking;

  const whatsappHref = `${contact.whatsapp}?text=${encodeURIComponent(
    `Hi Flex & Flow, I need to change my booking ${current.reference}.`,
  )}`;

  const whatsappLink = (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-body text-[15px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary ${FOCUS}`}
    >
      Message us on WhatsApp
    </a>
  );

  function actions() {
    if (current.status === "CANCELLED") {
      return (
        <>
          <h3 className={H3}>Nothing left to do here</h3>
          <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
            The time has been released. If you would like another session,
            start a new booking.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href={bookingUrl} variant="solid">
              Book another session
            </ButtonLink>
          </div>
          <p className="mt-4">{whatsappLink}</p>
        </>
      );
    }

    if (current.status === "COMPLETED") {
      return (
        <>
          <h3 className={H3}>This session has happened</h3>
          <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
            There is nothing to change on a session that has already taken
            place.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href={bookingUrl} variant="solid">
              Book another session
            </ButtonLink>
          </div>
        </>
      );
    }

    if (current.status === "NO_SHOW") {
      return (
        <>
          <h3 className={H3}>Marked as missed</h3>
          <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
            The studio recorded this session as missed. If that is wrong, tell
            us and we will correct it.
          </p>
          <p className="mt-4">{whatsappLink}</p>
        </>
      );
    }

    if (!current.canCancel && !current.canReschedule) {
      return (
        <>
          <h3 className={H3}>Too close to change here</h3>
          <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
            You can move or cancel a booking yourself{" "}
            {cutoffWindow(cutoffHours)}. Your session is nearer than that, and
            the therapist&rsquo;s day is already built around it — so this last
            stretch is handled by a person rather than a button.
          </p>
          <p className="mt-4">{whatsappLink}</p>
          <p className="mt-2 font-body text-[15px] leading-[1.6]">
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
            >
              {contact.phone}
            </a>
          </p>
        </>
      );
    }

    return (
      <>
        {current.canReschedule ? (
          <section className="border-b border-secondary/10 pb-5">
            <h3 className={H3}>Move this booking</h3>
            <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
              Pick a new date and time in the booking form. It stays the same
              booking: same reference, same treatment.
            </p>
            {/* The wizard reads `?reschedule=<token>` and loads the existing
                booking from it rather than starting an empty flow, which is why
                this is a link and not a second date picker: the picker lives in
                `components/booking/` and exists once. */}
            <div className="mt-4">
              <ButtonLink
                href={`${bookingUrl}?reschedule=${encodeURIComponent(token)}`}
                variant="solid"
              >
                Choose a new time
              </ButtonLink>
            </div>
          </section>
        ) : null}

        <div className={current.canReschedule ? "pt-5" : ""}>
          <CancelBooking
            booking={current}
            token={token}
            whatsappHref={whatsappHref}
            onCancelled={setCancelled}
          />
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <BookingCard booking={current} />

      <div className={`${CARD} h-fit p-5`}>{actions()}</div>
    </div>
  );
}
