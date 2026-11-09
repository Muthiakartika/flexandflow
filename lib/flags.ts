/**
 * Build-time feature switches.
 *
 * Kept free of imports so `next.config.ts` can read it directly — the academy
 * switch has to be visible both to React components and to the redirect table,
 * and a module with dependencies would not survive being pulled into the
 * config's own loader.
 */

/**
 * Whether Flex & Flow Academy is published on flexandflow.fit.
 *
 * `false` hides it without deleting a line of it. With the switch off:
 *
 * - `lib/site.ts` drops the Academy entry from `primaryNav`, so it disappears
 *   from the desktop nav, the mobile drawer, and anything else built from that
 *   list. Nothing else in the header or footer links to it.
 * - `next.config.ts` sends `/academy` and everything under it to the home page
 *   with a **temporary** 307, and stops advertising the academy's legacy
 *   top-level paths (`/courses/…`, `/schedule`, …). Temporary is the point: a
 *   301 would be cached by browsers and search engines and would outlive the
 *   switch.
 * - `app/(academy)/layout.tsx` adds `noindex, nofollow`, so the pages stay out
 *   of the index even if a host serves them without honouring the redirects.
 *
 * The route files, components under `components/academy/`, the data in
 * `lib/academy.ts` and the academy's own stylesheet are all untouched and keep
 * building. Publishing the academy is this one value going back to `true`.
 *
 * None of this touches the studio site's own SEO: `/academy` has never been a
 * live URL on this domain (it 404s on the WordPress site today), so there is no
 * ranking or indexed page to lose by holding it back.
 */
export const ACADEMY_ENABLED = false;

/**
 * Whether this app's own booking wizard (`/appointment/`) takes new bookings.
 *
 * **Off — 2026-11-09.** Turned on earlier that day at the owner's request,
 * then back off before deploying because the wizard is still being tested.
 *
 * `true`: every "Book …" CTA goes to the internal wizard — Phase 3,
 * BOOKING-PLAN.md — and a CTA that knows which treatment or therapist it
 * belongs to deep-links into it (`/appointment/?service=<slug>`,
 * `?staff=<slug>`; see `bookingHref` in `lib/site.ts`).
 *
 * `false` puts every CTA back on `externalBookingUrl`
 * (booking.flexandflow.fit, the WordPress plugin) in a new tab, exactly as
 * between 2026-08-24 and the switch. The wizard keeps working at its URL
 * either way — reschedule links in confirmation emails depend on it.
 */
export const BOOKING_ENABLED: boolean = false;

/**
 * Whether the client intake & consent form at `/intake` is live.
 *
 * **Closed — 2026-11-09, owner's request: "langsung book aja".** Every "Book"
 * button goes straight to the booking wizard with no form in front of it, in
 * every environment. Hard-coded rather than read from
 * `NEXT_PUBLIC_INTAKE_ENABLED`, so a leftover env var (`.env.local` still sets
 * it to `"true"`) cannot reopen it. The form is built and works
 * (INTAKE-PLAN.md); reopening it is
 * `process.env.NEXT_PUBLIC_INTAKE_ENABLED === "true"` back in place of `false`.
 *
 * With the switch off:
 *
 * - every booking CTA goes straight to the booking destination — the
 *   internal wizard while `BOOKING_ENABLED`, otherwise `externalBookingUrl`
 *   in a new tab (`bookingHref` and `bookingCtaProps` in `lib/site.ts`);
 * - `app/(main)/intake/page.tsx` answers 404.
 *
 * The admin side (`/admin/intake/`, field builder, submissions) keeps working
 * either way — it is behind the login and is how the form gets prepared.
 */
export const INTAKE_ENABLED: boolean = false;
