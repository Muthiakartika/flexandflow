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
