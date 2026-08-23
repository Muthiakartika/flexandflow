/**
 * The shapes the panel shows while a page is still coming back.
 *
 * Every admin route is server-rendered on demand and every one of them queries
 * Neon, so a click has a real round trip behind it — the studio's own report
 * was that pressing something did nothing and then the answer appeared. These
 * are what `loading.tsx` puts on screen in the meantime, and they are laid out
 * to match the page they stand in for: same heading, same number of cards,
 * same table with the same columns. A skeleton that does not match its page
 * moves everything the moment the data lands, which reads as a second, worse
 * kind of slowness.
 *
 * Server components with no JavaScript, like the rest of the panel. The pulse
 * is one CSS animation in `admin.css`, and it stops for anyone who has asked
 * their system for reduced motion.
 */

import type { ReactNode } from "react";

/** One grey bar. Size it with Tailwind; the colour and pulse come from CSS. */
export function SkeletonBar({ className = "h-4 w-32" }: { className?: string }) {
  return <span className={`admin-skeleton block ${className}`} />;
}

/** Stands in for `PageHeading`: the title, its lede, and any action button. */
export function SkeletonHeading({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <SkeletonBar className="h-[34px] w-[180px]" />
        <SkeletonBar className="mt-2 h-3 w-[240px]" />
      </div>
      {action ? <SkeletonBar className="h-9 w-[150px] rounded-[8px]" /> : null}
    </div>
  );
}

/** The row of `Stat` cards at the top of the agenda and the settings page. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="admin-card px-4 py-3">
          <SkeletonBar className="h-3 w-[86px]" />
          <SkeletonBar className="mt-2 h-6 w-[64px]" />
          <SkeletonBar className="mt-2 h-3 w-[110px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * A `Panel`, optionally with a table inside it.
 *
 * `rows` of `0` gives the bare card that the filter row and the form panels
 * are, and any other number gives that many table rows — which is why the
 * agenda and the bookings list can both be built out of this one piece.
 */
export function SkeletonPanel({
  header = true,
  columns = 0,
  rows = 0,
  children,
}: {
  header?: boolean;
  columns?: number;
  rows?: number;
  children?: ReactNode;
}) {
  return (
    <section className="admin-card mb-5">
      {header ? (
        <div className="border-b border-line px-4 py-3">
          <SkeletonBar className="h-4 w-[140px]" />
          <SkeletonBar className="mt-2 h-3 w-[200px]" />
        </div>
      ) : null}
      <div className="p-4">
        {columns > 0 ? <SkeletonTable columns={columns} rows={rows} /> : children}
      </div>
    </section>
  );
}

/**
 * A table, at the real one's column count.
 *
 * The header row is drawn narrower than the body rows for the same reason the
 * real one is: they are short uppercase labels over sentences.
 */
export function SkeletonTable({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <div className="admin-scroll">
      <div className="min-w-[42rem]">
        <div className="flex gap-4 border-b border-line px-3 pb-2">
          {Array.from({ length: columns }, (_, index) => (
            <SkeletonBar key={index} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="flex gap-4 border-b border-line/60 px-3 py-3 last:border-b-0"
          >
            {Array.from({ length: columns }, (_, index) => (
              <SkeletonBar key={index} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grid of form fields, for the pages that are mostly a form. */
export function SkeletonFields({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <SkeletonBar className="h-3 w-[72px]" />
          <SkeletonBar className="mt-1.5 h-[38px] w-full rounded-[8px]" />
        </div>
      ))}
    </div>
  );
}
