import { MAX_SEATS } from "@/lib/academy";

/**
 * Component 3 of 10 — Badge.
 *
 * Small pill label. `SeatsBadge` is the one meaningful specialisation:
 * seat scarcity is the academy's core message, so it gets consistent
 * wording and colour everywhere it appears.
 */
export function Badge({
  children,
  tone = "olive",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "olive" | "ink" | "quiet" | "light";
  className?: string;
}) {
  const tones = {
    olive: "bg-olive text-white",
    ink: "bg-ink text-white",
    quiet: "bg-paper text-muted",
    light: "border border-white/30 text-white",
  };
  return (
    <span
      // Stays on --radius-pill on purpose. A badge is a label, not a
      // control — the fully-rounded shape is what distinguishes it from a
      // small button at a glance. Change it to rounded-control only if you
      // want badges and buttons to look like the same kind of thing.
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-bold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function SeatsBadge({
  seatsLeft,
  className = "",
}: {
  seatsLeft: number;
  className?: string;
}) {
  if (seatsLeft === 0) {
    return (
      <Badge tone="quiet" className={className}>
        Fully booked
      </Badge>
    );
  }
  // Below half capacity reads as scarce, so it earns the solid accent.
  const scarce = seatsLeft <= MAX_SEATS / 2;
  return (
    <Badge tone={scarce ? "olive" : "quiet"} className={className}>
      {seatsLeft} of {MAX_SEATS} seats left
    </Badge>
  );
}
