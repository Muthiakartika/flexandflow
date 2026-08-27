import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AddToCalendar from "@/components/booking-result/AddToCalendar";
import BookingCard from "@/components/booking-result/BookingCard";
import { cutoffWindow } from "@/components/booking-result/cutoff";
import PageHero from "@/components/ui/PageHero";
import { BAND, BAND_LINE, CARD, FOCUS, H2, LINK, WRAP } from "@/components/ui/tokens";
import { loadBookingByReference, toBookingView } from "@/lib/booking/view";
import { normaliseReference } from "@/lib/booking/reference";
import { env } from "@/lib/env";
import { contact, workingHours } from "@/lib/site";

/**
 * The page must never be built ahead of a request: it is keyed by a booking
 * that did not exist a second ago, and it is the first thing the customer sees
 * after paying attention to a five-step form.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  /* Deliberately impersonal. The title is what lands in a browser tab, a
     history entry and a shared screenshot; the customer's name and the
     reference belong on the page, not above it. */
  title: "Booking confirmed - Flex and Flow",
  /* `null` rather than omitted: an absent description inherits the root
     layout's, which describes the studio, not this. */
  description: null,
  /* A page keyed by a booking reference must never be indexed. */
  robots: { index: false, follow: false },
};

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  contact.address,
)}`;

export default async function BookingConfirmationPage(
  props: PageProps<"/appointment/confirmation/[reference]">,
) {
  const { reference } = await props.params;

  /* References get typed back in by hand and read off screens — lowercase, or
     without the dash. `normaliseReference` is what accepts those; anything it
     rejects never reaches the database. */
  const normalised = normaliseReference(reference);
  if (!normalised) notFound();

  const row = await loadBookingByReference(normalised);
  if (!row) notFound();

  const booking = toBookingView(row);
  const cutoffHours = env().BOOKING_CANCEL_CUTOFF_HOURS;

  const open = booking.status === "CONFIRMED" || booking.status === "PENDING";

  /* `manageUrl` is absolute because it is written into emails. On the site
     itself the same page is reached relatively, so a preview deployment does
     not hand people a link back to production. */
  const managePath = new URL(booking.manageUrl).pathname;

  const whatsappHref = `${contact.whatsapp}?text=${encodeURIComponent(
    `Hi Flex & Flow, this is about my booking ${booking.reference}.`,
  )}`;

  return (
    <>
      <PageHero
        title={open ? "Your booking is confirmed" : "Your booking"}
        crumbs={[{ label: "Booking confirmed" }]}
        lead={
          open
            ? "The time below is held for you. Quote the reference if you message us about this session."
            : "This is the record of the session you booked. Its current state is shown below."
        }
        actions={
          <div className={`${CARD} px-5 py-4`}>
            <p className="page-label">Booking reference</p>
            <p className="mt-1.5 font-display text-[34px] leading-none font-bold tracking-[0.04em] tabular-nums">
              {booking.reference}
            </p>
          </div>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <BookingCard booking={booking} />

          {/* ── Into the calendar, while the tab is still open ───────────── */}
          {/* The .ics in the confirmation email is the mechanism that actually
              works on a phone, but it arrives in an inbox nobody is looking at
              yet. This is the moment the appointment can still be captured. */}
          <div>
            <h2 className={H2}>Put it in your calendar</h2>
            <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[1.7] text-body-text/80">
              Three ways in — pick whichever calendar you actually use.
            </p>
            <div className="mt-5">
              <AddToCalendar
                googleUrl={booking.googleCalendarUrl}
                icsUrl={booking.icsUrl}
                emailed={Boolean(booking.customer.email)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── What happens next ─────────────────────────────────────────────── */}
      <div className={BAND_LINE}>
        <section className={`${WRAP} ${BAND}`}>
          <h2 className={H2}>What happens next</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`${CARD} p-5`}>
              <h3 className="page-label">Where to come</h3>
              <p className="mt-2 font-body text-[15px] leading-[1.6]">
                {contact.address}
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block ${LINK}`}
              >
                Open in Google Maps
              </a>
            </div>

            <div className={`${CARD} p-5`}>
              <h3 className="page-label">Questions before you come</h3>
              <p className="mt-2 font-body text-[15px] leading-[1.6]">
                Message the studio and quote {booking.reference}.
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block ${LINK}`}
              >
                WhatsApp
              </a>
              <p className="mt-2">
                <a
                  href={contact.phoneHref}
                  className={`font-body text-[14px] tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
                >
                  {contact.phone}
                </a>
              </p>
            </div>

            <div className={`${CARD} p-5`}>
              <h3 className="page-label">Studio hours</h3>
              {workingHours.map((slot) => (
                <p
                  key={slot.days}
                  className="mt-2 font-body text-[15px] leading-[1.6]"
                >
                  {slot.days}
                  <br />
                  {slot.hours}
                </p>
              ))}
              <p className="mt-2 font-body text-[14px] leading-[1.6] text-body-text/65">
                All times are Bali time (WITA).
              </p>
            </div>

            <div className={`${CARD} p-5`}>
              <h3 className="page-label">Changing your mind</h3>
              <p className="mt-2 font-body text-[15px] leading-[1.6]">
                You can move or cancel this booking yourself{" "}
                {cutoffWindow(cutoffHours)}. After that, message the studio and
                a person will sort it out.
              </p>
              <Link href={managePath} className={`mt-3 inline-block ${LINK}`}>
                Manage this booking
              </Link>
            </div>
          </div>

          <p className="mt-6 max-w-[68ch] font-body text-[15px] leading-[1.7] text-body-text/75">
            Keep this page&rsquo;s link, or the one in your email — both open
            the booking again from any device.
          </p>
        </section>
      </div>
    </>
  );
}
