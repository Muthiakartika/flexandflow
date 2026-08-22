import type { BookingStatusValue } from "@/lib/booking/types";

/**
 * What state a booking is in, said in words.
 *
 * Colour alone cannot carry this — a cancelled session and a confirmed one have
 * to read differently with the palette switched off, printed, or by a screen
 * reader. So the label is the signal and the fill only reinforces it.
 */
const LABEL: Record<BookingStatusValue, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Marked as missed",
};

/* Olive at `text-primary-strong` is 4.76:1 on white; the brand olive itself is
   not, which is why the badge does not use it. See DESIGN.md. */
const TONE: Record<BookingStatusValue, string> = {
  PENDING: "border-secondary/25 text-body-text/80",
  CONFIRMED: "border-primary/50 text-primary-strong",
  COMPLETED: "border-secondary/25 text-body-text/80",
  CANCELLED: "border-secondary bg-secondary text-white",
  NO_SHOW: "border-secondary/55 text-body-text",
};

export default function StatusBadge({
  status,
}: {
  status: BookingStatusValue;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-body text-[12px] leading-none ${TONE[status]}`}
    >
      <span className="sr-only">Status: </span>
      {LABEL[status]}
    </span>
  );
}

export { LABEL as STATUS_LABEL };
