"use client";

/**
 * A link that admits it has been clicked.
 *
 * A dot appears beside the label while the navigation is in flight. It is
 * always in the DOM at a fixed size — an indicator that pushes the label
 * sideways when it appears is worse than no indicator — and stays invisible
 * for its first 120ms, so a navigation that lands quickly never flashes
 * anything at anybody. Both of those live in the `.link-hint` rule, which each
 * stylesheet defines for itself.
 *
 * Which is why the class name is a prop. This project has three root layouts
 * and three stylesheets that never meet on a page; the admin panel's dot is
 * `.admin-link-hint` in `admin.css` and the studio site's is `.link-hint` in
 * `globals.css`, and one component serves both without knowing which it is in.
 *
 * `loading.tsx` is the better fix where it applies, and it covers most
 * navigations already. Two cases it cannot: a destination whose prefetch has
 * not finished, and a link back to the route you are already on — paging
 * through a list, where there is no new fallback to swap in and the screen
 * would otherwise sit unchanged.
 */

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Must be rendered inside a `<Link>`: that is where `useLinkStatus` reads from.
 *
 * Exported because `ButtonLink` renders the `<Link>` itself, so the only way to
 * get a hint inside one is to hand it in as a child. Everything else should use
 * `PendingLink` and not think about this.
 */
export function LinkPendingHint({ className = "link-hint" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`${className}${pending ? " is-pending" : ""}`} />
  );
}

export function PendingLink({
  children,
  hintClassName = "link-hint",
  ...props
}: ComponentProps<typeof Link> & {
  children: ReactNode;
  /** The stylesheet's own dot. Defaults to the studio site's. */
  hintClassName?: string;
}) {
  return (
    <Link {...props}>
      {children}
      <LinkPendingHint className={hintClassName} />
    </Link>
  );
}
