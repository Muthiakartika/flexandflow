/**
 * Booking defaults that more than one place has to agree on.
 *
 * `lib/env.ts` is the only reader of `process.env` in the booking system — with
 * one deliberate exception. It is `server-only` and throws when *any* booking
 * variable is missing, which is right for a route handler and wrong for a page
 * that `next build` renders without a runtime environment, so
 * `app/(main)/booking/page.tsx` reads its one value straight from the
 * environment and falls back. That fallback and the Zod schema's `.default()`
 * are the same number written twice, and the day the studio moves the cutoff
 * from 12 hours to 24 only one of them would be edited. Both read it from here
 * instead.
 *
 * Client-safe on purpose: no `server-only`, no environment, no database, no
 * imports beyond types — a client component may import it.
 *
 * Only genuinely shared values belong here. The studio timezone does not: it is
 * `STUDIO_TZ` in `lib/booking/time.ts`, a constant rather than an environment
 * variable precisely so the wizard can render slots in the browser, and moving
 * it here would create the second copy this file exists to prevent.
 */

/**
 * How many hours before a session a guest can still cancel or move it
 * themselves. Overridden by `BOOKING_CANCEL_CUTOFF_HOURS`; inside the window
 * the manage page sends them to WhatsApp instead.
 */
export const DEFAULT_CANCEL_CUTOFF_HOURS = 12;
