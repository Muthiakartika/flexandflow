/**
 * Opaque tokens for the links a customer follows without logging in: the
 * manage-booking page and the `.ics` download.
 *
 * The booking id alone will not do. Ids are sequential enough to walk, and a
 * URL that takes one would let anybody read every appointment in the studio's
 * diary — names, phone numbers, and when each person will be lying face down
 * in a room. The token is an HMAC over the id, so a guess has to forge a
 * signature it cannot compute.
 *
 * Tokens do not expire. They are single-purpose, revocable by cancelling the
 * booking, and an expiry would break the link in an email the customer keeps.
 */
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * A tilde, not a dot.
 *
 * `trailingSlash: true` exempts "URLs with a file extension" from the slash it
 * otherwise appends, and Next decides that by looking for a dot in the last
 * path segment. A token shaped `<id>.<signature>` is the last segment of
 * `/booking/manage/<token>/`, so every link in every confirmation email spent a
 * 308 before it reached the page. `~` is unreserved in RFC 3986, so it survives
 * a URL untouched, and it appears in neither a cuid nor base64url — which is
 * what makes `lastIndexOf` below unambiguous.
 */
const SEPARATOR = "~";

function sign(payload: string): string {
  return createHmac("sha256", env().BOOKING_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
}

/** `<bookingId>~<signature>`, URL-safe. */
export function createManageToken(bookingId: string): string {
  return `${bookingId}${SEPARATOR}${sign(bookingId)}`;
}

/**
 * The booking id a token vouches for, or null.
 *
 * Compared with `timingSafeEqual` — a plain `===` leaks how much of a forged
 * signature was right through how long the comparison took, which is enough to
 * reconstruct one byte at a time.
 */
export function readManageToken(token: string): string | null {
  const index = token.lastIndexOf(SEPARATOR);
  if (index <= 0) return null;

  const bookingId = token.slice(0, index);
  const provided = token.slice(index + 1);
  const expected = sign(bookingId);

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;

  return timingSafeEqual(a, b) ? bookingId : null;
}

/** Guards the cron endpoints. Vercel Cron sends this header. */
export function isAuthorisedCron(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env().CRON_SECRET}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
