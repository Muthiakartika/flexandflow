import type { Metadata } from "next";
import { Suspense } from "react";

import BookingWizard from "@/components/booking/BookingWizard";
import PageHero from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { BAND, WRAP } from "@/components/ui/tokens";
import { listStaff } from "@/lib/booking/catalogue";
import { DEFAULT_CANCEL_CUTOFF_HOURS } from "@/lib/booking/defaults";
import type { StaffOption } from "@/lib/booking/types";
import { contact } from "@/lib/site";

const description =
  "Book an appointment with Flex and Flow in Uluwatu: choose your therapist, " +
  "your treatment and a time that suits you.";

/** `?staff=a&staff=b` arrives as an array; take the first and ignore the rest. */
function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

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
 * that — it was tried twice, on a clean dev server and on a production build,
 * and the HTML was still the fallback; it only cost a server render per visit.
 * (If the fallback ever appears to hang rather than flash, clear the browser
 * cache before suspecting the code: a stale cached chunk produced exactly that
 * symptom for a long time during development.)
 *
 * What that leaves is the therapist. A "Book with Ginny" link used to be
 * resolved in an effect after the staff list had been fetched, which meant the
 * staff step painted, then disappeared — a visible glitch on the way to a step
 * the visitor had already earned. It is resolved here instead, before anything
 * is sent, and handed to the wizard as its opening state.
 */
export default async function BookingPage(props: PageProps<"/booking">) {
  const params = await props.searchParams;
  const slug = first(params.staff);

  /* Only when a link actually named someone: an ordinary visit should not pay
     for a query it has no use for. A slug nobody answers to — a renamed
     therapist, a mistyped link — simply falls through to the usual first
     question rather than to an error. */
  const preselected: StaffOption | null = slug
    ? ((await listStaff()).find((option) => option.slug === slug) ?? null)
    : null;

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
          <BookingWizard
            cancelCutoffHours={cancelCutoffHours}
            preselectedStaff={preselected}
          />
        </Suspense>
      </section>
    </>
  );
}
