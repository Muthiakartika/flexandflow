import Link from "next/link";
import type { ReactNode } from "react";

import { BAND_LINE, FOCUS, H1, WRAP } from "./tokens";

export type Crumb = { label: string; href?: string };

/**
 * Inner-page title band.
 *
 * The theme put a washed-out stock yoga photo behind a 74px centred title on
 * every page — the same image whatever the page was about, at a size that
 * competed with the page's own content. This states the page instead:
 * breadcrumb, title, optional lead, on the cream ground, left-aligned so it
 * starts on the same line as everything below it.
 */
export default function PageHero({
  title,
  crumbs = [],
  eyebrow,
  lead,
  actions,
}: {
  title: string;
  /** Trail after "Home"; the last entry renders as the current page. */
  crumbs?: Crumb[];
  eyebrow?: string;
  /** Short standfirst under the title. */
  lead?: string;
  /** Buttons or links shown beside the copy. */
  actions?: ReactNode;
}) {
  return (
    <div className={BAND_LINE}>
      <div
        className={`${WRAP} pt-[clamp(1.25rem,2.4vw,2rem)] pb-[clamp(1.75rem,3vw,2.5rem)]`}
      >
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link
                href="/"
                className={`page-label transition-colors duration-300 hover:text-primary ${FOCUS}`}
              >
                Home
              </Link>
            </li>

            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-2">
                  <span aria-hidden className="page-label">
                    /
                  </span>
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className={`page-label transition-colors duration-300 hover:text-primary ${FOCUS}`}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? "page" : undefined}
                      className="page-label max-w-[46ch] truncate text-body-text"
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            {eyebrow ? <p className="page-label mb-2">{eyebrow}</p> : null}
            <h1 className={`max-w-[60ch] ${H1}`}>{title}</h1>
            {lead ? (
              <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.7] text-body-text/75">
                {lead}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
