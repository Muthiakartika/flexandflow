import type { Metadata } from "next";
import { Suspense } from "react";

import BookingWizard from "@/components/booking/BookingWizard";
import PageHero from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { BAND, WRAP } from "@/components/ui/tokens";
import { DEFAULT_CANCEL_CUTOFF_HOURS } from "@/lib/booking/defaults";
import { contact } from "@/lib/site";

const description =
  "Book an appointment with Flex and Flow in Uluwatu: choose your therapist, " +
  "your treatment and a time that suits you.";

export const metadata: Metadata = {
  title: "Book Appointment - Flex and Flow",
  description,
  alternates: { canonical: "/booking/" },
  openGraph: {
    title: "Book Appointment - Flex and Flow",
    description,
    url: "/booking/",
    type: "website",
  },
};

/**
 * How long before a session a guest can still cancel it themselves.
 *
 * Read straight from the environment rather than through `lib/env.ts`, which
 * is `server-only` and throws when *any* booking variable is missing — that is
 * right for a route handler and wrong for a page, because `next build` renders
 * this one without a runtime environment and the whole route would fail on a
 * missing SendGrid key. The fallback is the same constant the schema's own
 * `.default()` is built from, so the two cannot drift apart.
 */
const cancelCutoffHours = Number(
  process.env.BOOKING_CANCEL_CUTOFF_HOURS ?? DEFAULT_CANCEL_CUTOFF_HOURS,
);

/**
 * The booking page.
 *
 * Booking used to live on WordPress and `/booking` redirected out to it. It
 * runs here now, inside `(main)`, so it keeps the site's header, footer and
 * measure instead of dropping a visitor onto a differently-styled island
 * halfway through deciding to spend money.
 *
 * The wizard reads its step from the query string, so it sits behind a
 * `Suspense` boundary — `useSearchParams` in a client component needs one, or
 * the whole page opts out of static rendering.
 *
 * A consequence worth knowing before someone tries to "fix" it: because this
 * route is prerendered, Next renders everything below that boundary on the
 * client, so the served HTML is the fallback and the wizard appears once the
 * bundle has hydrated. Marking the route `force-dynamic` does **not** change
 * that — it was tried, the HTML was still the fallback, and it only cost a
 * server render per visit. Getting the first paint to carry a real step means
 * reading `searchParams` here and passing them down as props, so the wizard
 * does not need the hook to know where it starts.
 */
export default function BookingPage() {
  return (
    <>
      <PageHero
        title="Book Appointment"
        crumbs={[{ label: "Book Appointment" }]}
        lead={description}
        actions={
          <ButtonLink href={contact.whatsapp} external variant="outline">
            Ask on WhatsApp
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        <Suspense
          fallback={
            <p className="font-body text-[15px] text-body-text/60">
              Loading the booking form…
            </p>
          }
        >
          <BookingWizard cancelCutoffHours={cancelCutoffHours} />
        </Suspense>
      </section>
    </>
  );
}
