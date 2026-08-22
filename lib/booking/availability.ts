/**
 * Slot generation, reduced to arithmetic.
 *
 * Everything here is a pure function of its arguments: no database, no
 * environment, no `server-only`. That is deliberate and is the reason the
 * awkward parts of this system — the midday break, the clean-down buffer, the
 * lead time, midnight boundaries — can be tested without a Postgres instance,
 * and why the same code could run in the browser if the wizard ever needed to
 * re-derive a slot list locally.
 *
 * The database side of availability lives in `lib/booking/slots.ts`, which
 * loads rows and calls into here.
 */
import { overlaps, studioInstant, type IsoDate } from "@/lib/booking/time";

/** One continuous stretch of a therapist's day, in minutes since local midnight. */
export type WorkingBlock = { startMinute: number; endMinute: number };

/** Anything that makes a therapist unavailable: a booking, or time off. */
export type BusyInterval = { startAt: Date; endAt: Date };

export type SlotCandidate = {
  /** Minutes since studio-local midnight. */
  startMinute: number;
  /**
   * `startMinute + durationMinutes` — where the *session* ends, which is what
   * the customer is told. The clean-down buffer is deliberately not in here;
   * it only shows up in `endAt`.
   */
  endMinute: number;
  startAt: Date;
  /**
   * `startAt + durationMinutes + bufferMinutes` — when the room and the
   * therapist are free again. This is the value written to `Booking.endAt`,
   * and therefore the one the Postgres exclusion constraint compares. Confusing
   * it with the session end books people into the cleaning gap.
   */
  endAt: Date;
};

export function slotCandidates(input: {
  date: IsoDate;
  workingBlocks: WorkingBlock[];
  busy: BusyInterval[];
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  leadTimeMinutes: number;
  now: Date;
}): SlotCandidate[] {
  const {
    date,
    workingBlocks,
    busy,
    durationMinutes,
    bufferMinutes,
    leadTimeMinutes,
    now,
  } = input;

  // A zero or negative step would spin forever. Misconfiguration should degrade
  // to a useless-but-finite slot list, not hang a request handler.
  const step = Math.max(1, Math.trunc(input.stepMinutes));
  const occupied = durationMinutes + bufferMinutes;
  const earliest = now.getTime() + leadTimeMinutes * 60_000;

  /** Keyed by start minute: two working blocks may overlap and repeat a start. */
  const found = new Map<number, SlotCandidate>();

  for (const block of workingBlocks) {
    // Keeping only starts whose whole occupied span fits inside the block is
    // what produces the midday break for free: 09:00–12:00 with a 90-minute
    // service admits 09:00 and 10:30 and nothing after, exactly as the old
    // BookingPress flow did.
    for (
      let startMinute = block.startMinute;
      startMinute + occupied <= block.endMinute;
      startMinute += step
    ) {
      if (found.has(startMinute)) continue;

      const startAt = studioInstant(date, startMinute);
      if (startAt.getTime() < earliest) continue;

      const endAt = studioInstant(date, startMinute + occupied);
      const collides = busy.some((interval) =>
        overlaps(startAt, endAt, interval.startAt, interval.endAt),
      );
      if (collides) continue;

      found.set(startMinute, {
        startMinute,
        endMinute: startMinute + durationMinutes,
        startAt,
        endAt,
      });
    }
  }

  return [...found.values()].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );
}
