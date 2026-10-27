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
 * Whether the client intake & consent form at `/intake` is live.
 *
 * **Off unless the environment says otherwise.** The form is built and works
 * (INTAKE-PLAN.md), but the owner is holding it back from flexandflow.fit for
 * now. Read from `NEXT_PUBLIC_INTAKE_ENABLED`, which `.env.local` sets to
 * `true` for development; production leaves it unset. `NEXT_PUBLIC_` because
 * the header and the mobile drawer are client components, and Next inlines
 * the value at build time — changing it on Vercel needs a redeploy.
 *
 * With the switch off:
 *
 * - every booking CTA goes straight to `externalBookingUrl` in a new tab,
 *   exactly as the live site did before the form existed (`bookingCtaHref`
 *   and `bookingCtaProps` in `lib/site.ts`);
 * - `app/(main)/intake/page.tsx` answers 404.
 *
 * The admin side (`/admin/intake/`, field builder, submissions) keeps working
 * either way — it is behind the login and is how the form gets prepared.
 */
export const INTAKE_ENABLED = process.env.NEXT_PUBLIC_INTAKE_ENABLED === "true";
