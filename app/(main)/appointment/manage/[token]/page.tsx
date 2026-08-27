import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ManageBooking from "@/components/booking-result/ManageBooking";
import PageHero from "@/components/ui/PageHero";
import { BAND, WRAP } from "@/components/ui/tokens";
import { loadBookingByToken, toBookingView } from "@/lib/booking/view";
import { env } from "@/lib/env";

/** Keyed by a live booking; there is nothing here to build ahead of time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage your booking - Flex and Flow",
  /* `null` rather than omitted, so this does not inherit the studio's own
     description from the root layout. */
  description: null,
  robots: { index: false, follow: false },
};

/**
 * Manage a booking from the link in the confirmation email.
 *
 * The URL is the only credential — there is no login — so the token is an HMAC
 * and a forged one has to be indistinguishable from a booking that was never
 * made. `loadBookingByToken` returns null for both, and both end at the same
 * 404: telling someone their signature was wrong tells them a signature is
 * what is being checked, and that guessing ids is worth their time.
 */
export default async function ManageBookingPage(
  props: PageProps<"/appointment/manage/[token]">,
) {
  const { token } = await props.params;

  const row = await loadBookingByToken(token);
  if (!row) notFound();

  const booking = toBookingView(row);

  return (
    <>
      <PageHero
        title="Manage your booking"
        eyebrow={`Reference ${booking.reference}`}
        crumbs={[{ label: "Manage booking" }]}
        lead="Everything you booked is below, along with the two things you can change yourself."
      />

      <section className={`${WRAP} ${BAND}`}>
        <ManageBooking
          booking={booking}
          token={token}
          cutoffHours={env().BOOKING_CANCEL_CUTOFF_HOURS}
        />
      </section>
    </>
  );
}
