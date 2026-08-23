import type { ReactNode } from "react";

import { BOOKING_STATUS_LABEL } from "@/lib/admin/labels";
import type { BookingStatusValue } from "@/lib/booking/types";

/**
 * The small pieces every admin page repeats: a page heading, a panel, a
 * horizontally scrolling table box, a status chip.
 *
 * Server components — none of them hold state, and keeping them off the client
 * means the tables the panel is mostly made of ship no JavaScript at all.
 */

export function PageHeading({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[34px] leading-[1.05] font-bold text-ink">
          {title}
        </h1>
        {lede ? <p className="mt-1 text-[14px] text-muted">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-card mb-5">
      {title || description ? (
        <div className="border-b border-line px-4 py-3">
          {title ? (
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          ) : null}
          {description ? (
            <div className="mt-1 text-[13px] text-muted">{description}</div>
          ) : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

/**
 * Wraps a table so it — and not the page — is what scrolls sideways.
 *
 * The owner opens this panel on a phone. A booking row is wider than any
 * phone, and a body that scrolls horizontally makes the nav drift off screen
 * and never quite come back.
 */
export function TableBox({ children }: { children: ReactNode }) {
  return <div className="admin-scroll">{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-6 text-center text-[14px] text-faint">{children}</p>;
}

const STATUS_STYLE: Record<BookingStatusValue, string> = {
  PENDING: "bg-warn-soft text-warn",
  CONFIRMED: "bg-ok-soft text-ok",
  COMPLETED: "bg-cream text-muted",
  CANCELLED: "bg-danger-soft text-danger",
  NO_SHOW: "bg-danger-soft text-danger",
};

export function StatusChip({ status }: { status: BookingStatusValue }) {
  return (
    <span className={`admin-chip ${STATUS_STYLE[status]}`}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

const JOB_STYLE: Record<string, string> = {
  PENDING: "bg-cream text-muted",
  SENT: "bg-ok-soft text-ok",
  FAILED: "bg-warn-soft text-warn",
  DEAD: "bg-danger-soft text-danger",
};

export function JobChip({ status }: { status: string }) {
  return (
    <span className={`admin-chip ${JOB_STYLE[status] ?? "bg-cream text-muted"}`}>
      {status.toLowerCase()}
    </span>
  );
}

/** A labelled figure. Four of these are the whole top of the agenda page. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="admin-card px-4 py-3">
      <p className="text-[11px] font-bold tracking-[0.06em] text-faint uppercase">
        {label}
      </p>
      <p className="mt-1 text-[24px] leading-none font-bold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-faint">{hint}</p> : null}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-[12px] font-bold text-danger">
      {message}
    </p>
  );
}
