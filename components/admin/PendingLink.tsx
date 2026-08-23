"use client";

/**
 * A link that admits it has been clicked.
 *
 * `loading.tsx` covers most of this already — a click on a nav link paints a
 * skeleton in the content area straight away. Two cases it does not cover, and
 * they are the two the studio notices:
 *
 * - **Prefetching still in flight.** Until the destination's fallback has been
 *   fetched, the browser stays on the current page with nothing happening.
 * - **Same route, different query.** Paging through the bookings list is a
 *   navigation to `/admin/bookings/` again, and the eye has nothing to catch:
 *   the heading, the filters and the table are all still there and correct.
 *
 * So the link itself says so, with a dot that appears beside its label. Fixed
 * size and always in the DOM — an indicator that pushes the text sideways when
 * it appears is worse than no indicator — and invisible for the first 120ms,
 * so a navigation that lands quickly never flashes anything. Both of those
 * live in `.admin-link-hint` in `admin.css`.
 */

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Must be rendered inside a `<Link>`: that is where `useLinkStatus` reads from. */
function Hint() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`admin-link-hint${pending ? " is-pending" : ""}`} />
  );
}

export function PendingLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link {...props} className={className}>
      {children}
      <Hint />
    </Link>
  );
}
