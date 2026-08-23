"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PendingLink } from "@/components/admin/PendingLink";

/**
 * The panel's navigation: a sidebar on a laptop, a wrapped row of links on a
 * phone. Which one you get is decided by an explicit `@media` block in
 * `admin.css` rather than a Tailwind arbitrary breakpoint variant, because
 * those have silently failed in this project (CLAUDE.md, gotcha 2).
 *
 * Client-side only for `usePathname` — the current page has to be marked, or
 * on a phone this is six near-identical links with nothing to say where you
 * are.
 */

/* Trailing slashes throughout: `trailingSlash: true` in `next.config.ts`, so
   these are the URLs actually served and `usePathname` returns them verbatim. */
const LINKS = [
  { href: "/admin/", label: "Today" },
  { href: "/admin/bookings/", label: "Bookings" },
  { href: "/admin/schedule/", label: "Schedule" },
  { href: "/admin/services/", label: "Services" },
  { href: "/admin/settings/", label: "Settings" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  /* "Today" is the index, so it would prefix-match every other page. */
  if (href === "/admin/") return pathname === "/admin/" || pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminNav({
  adminName,
  adminEmail,
}: {
  adminName: string;
  adminEmail: string;
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  /* The rule between nav and content moves from the bottom edge to the right
     edge when the sidebar appears. Both live in `admin.css`, so no Tailwind
     `border` utility can outrank the media query that swaps them. */
  return (
    <header className="admin-sidebar bg-surface px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/"
          className="font-display text-[28px] leading-none font-bold text-ink"
        >
          Flex &amp; Flow
          <span className="ml-2 align-middle font-body text-[11px] font-bold tracking-[0.14em] text-olive uppercase">
            Admin
          </span>
        </Link>
      </div>

      <nav aria-label="Admin sections" className="mt-4">
        <ul className="admin-nav-list">
          {LINKS.map((link) => {
            const current = isCurrent(pathname, link.href);
            return (
              <li key={link.href}>
                <PendingLink
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`block rounded-[8px] px-3 py-2 text-[14px] font-bold transition-colors ${
                    current
                      ? "bg-olive-strong text-white"
                      : "text-ink hover:bg-cream"
                  }`}
                >
                  {link.label}
                </PendingLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[13px] font-bold text-ink">{adminName}</p>
        <p className="text-[12px] break-all text-faint">{adminEmail}</p>

        {/* A real form POST rather than a fetch: signing out has to work when
            the page's JavaScript has not loaded or has thrown, which is
            precisely when somebody wants to get out of it. The pending label is
            layered on top and changes nothing if the script never ran.

            The button is not `disabled` while it waits, on purpose: taking a
            submit button out of the form mid-submission cancels the submission
            in some browsers, and this one is a full page POST rather than a
            React action. Signing out twice costs nothing anyway. */}
        <form
          action="/api/admin/logout/"
          method="post"
          className="mt-3"
          onSubmit={() => setSigningOut(true)}
        >
          <button
            type="submit"
            aria-busy={signingOut || undefined}
            className={`admin-btn admin-btn-quiet w-full${
              signingOut ? " pointer-events-none opacity-60" : ""
            }`}
          >
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </form>
      </div>
    </header>
  );
}
