/**
 * Every change to a booking's status, in one file.
 *
 * Not because cancelling is complicated, but because of what is coming. When
 * the payment gateway lands (BOOKING-PLAN.md §9) its webhook has to move
 * bookings between states, expired holds have to be swept, and refunds have to
 * decide what "cancelled" means. If cancel lived in the cancel route and
 * reschedule lived in the reschedule route, that work would mean editing a
 * dozen handlers and finding out later which one was missed. It means editing
 * this file instead.
 *
 * The rules that live here rather than in any caller:
 *   - a customer cannot act inside the cancellation cutoff; an admin can,
 *     because an admin is on the phone to the therapist while they do it
 *   - a cancelled booking is final — nothing acts on it again
 *   - `icsSequence` rises on every change, or the customer's calendar gains a
 *     second event instead of updating the one it already has
 *   - every change writes an `AuditLog` row
 *
 * Notifications are queued by the routes, not from here, exactly as they are
 * for `createBooking`. A transition is a database fact; whether anyone is told
 * about it is the caller's business — the admin panel, for one, can move a
 * booking without messaging the customer.
 */
import "server-only";

import { addMinutes } from "date-fns";

import { BookingStatus } from "@/generated/prisma/enums";
import { isTherapistFree, resolveSlot } from "@/lib/booking/slots";
import type { ApiError, BookingStatusValue, StaffSelection } from "@/lib/booking/types";
import { loadBookingById, type LoadedBooking } from "@/lib/booking/view";
import { isSlotTakenError, prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type Actor = "customer" | "admin";

export type TransitionResult =
  | { ok: true; booking: LoadedBooking }
  | { ok: false; code: ApiError["code"]; message: string };

const NOT_FOUND: TransitionResult = {
  ok: false,
  code: "NOT_FOUND",
  message: "We could not find that booking.",
};

const ALREADY_CANCELLED: TransitionResult = {
  ok: false,
  code: "ALREADY_CANCELLED",
  message: "That booking has already been cancelled.",
};

/**
 * `COMPLETED` and `NO_SHOW` are past events, not open bookings. There is no
 * ApiError code for "this already happened", and `CUTOFF_PASSED` is the
 * closest true statement: the window in which this could be changed is gone.
 */
const ALREADY_HAPPENED: TransitionResult = {
  ok: false,
  code: "CUTOFF_PASSED",
  message:
    "That session has already taken place. Please message the studio on " +
    "WhatsApp if something is wrong.",
};

function cutoffRefusal(): TransitionResult {
  const hours = env().BOOKING_CANCEL_CUTOFF_HOURS;
  return {
    ok: false,
    code: "CUTOFF_PASSED",
    message:
      `Bookings can only be changed more than ${hours} hours in advance. ` +
      `Please message the studio on WhatsApp and we will sort it out.`,
  };
}

/**
 * True once the session is close enough that the customer may no longer touch
 * it themselves. Admins are never subject to this — the same rule as
 * `canCancel` in `lib/booking/view.ts`, which is what the manage page renders
 * its buttons from, so the page and the endpoint always agree.
 */
function pastCutoff(startAt: Date, now: Date): boolean {
  const hours = env().BOOKING_CANCEL_CUTOFF_HOURS;
  return startAt.getTime() - now.getTime() <= hours * 60 * 60 * 1000;
}

type AuditMeta = Record<string, string | number | boolean | null>;

/**
 * `"system"` is not an `Actor`, deliberately.
 *
 * Nobody may pass it in: an expired hold has no author, and every exported
 * transition that takes a `by` still takes a person. It exists only so the
 * audit trail can say honestly that the hold sweeper, not a member of staff,
 * cancelled that booking at 3am.
 */
type AuditEntry = {
  actor: Actor | "system";
  action: string;
  bookingId: string;
  meta?: AuditMeta;
};

/** Written inside the same transaction as the change it describes. */
function auditData(entry: AuditEntry) {
  return {
    actor: entry.actor,
    action: entry.action,
    entity: "Booking",
    entityId: entry.bookingId,
    meta: entry.meta ?? {},
  };
}

async function reload(bookingId: string): Promise<TransitionResult> {
  const booking = await loadBookingById(bookingId);
  if (!booking) return NOT_FOUND;
  return { ok: true, booking };
}

// ── Cancel ────────────────────────────────────────────────────────────────

export async function cancelBooking(input: {
  bookingId: string;
  by: Actor;
  reason?: string | null;
  now?: Date;
}): Promise<TransitionResult> {
  const now = input.now ?? new Date();
  const booking = await loadBookingById(input.bookingId);

  if (!booking) return NOT_FOUND;
  if (booking.status === BookingStatus.CANCELLED) return ALREADY_CANCELLED;
  if (
    booking.status === BookingStatus.COMPLETED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    return ALREADY_HAPPENED;
  }

  if (input.by === "customer" && pastCutoff(booking.startAt, now)) {
    return cutoffRefusal();
  }

  const reason = input.reason?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancelledBy: input.by,
        cancelReason: reason,
        /* The cancellation .ics carries METHOD:CANCEL, and a calendar client
           ignores it unless the SEQUENCE is higher than the event it already
           holds. Without this the appointment stays in the customer's phone. */
        icsSequence: { increment: 1 },
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: auditData({
        actor: input.by,
        action: "booking.cancelled",
        bookingId: booking.id,
        meta: { reason, previousStatus: booking.status },
      }),
    });
  });

  return reload(booking.id);
}

// ── Reschedule ────────────────────────────────────────────────────────────

export async function rescheduleBooking(input: {
  bookingId: string;
  startAt: Date;
  /** Omitted keeps the therapist the customer already has. */
  staff?: StaffSelection;
  by: Actor;
  now?: Date;
}): Promise<TransitionResult> {
  const now = input.now ?? new Date();
  const booking = await loadBookingById(input.bookingId);

  if (!booking) return NOT_FOUND;
  if (booking.status === BookingStatus.CANCELLED) return ALREADY_CANCELLED;
  if (
    booking.status === BookingStatus.COMPLETED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    return ALREADY_HAPPENED;
  }

  if (Number.isNaN(input.startAt.getTime())) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "That start time is not a valid date.",
    };
  }

  /* The cutoff applies to the booking being left as much as to the one being
     taken: a customer cannot free up tomorrow morning's slot an hour before it
     starts by calling it a reschedule. */
  if (input.by === "customer" && pastCutoff(booking.startAt, now)) {
    return cutoffRefusal();
  }

  const slot = await resolveSlot({
    staff: input.staff ?? booking.therapistId,
    variantId: booking.variantId,
    startAt: input.startAt,
    now,
  });

  if (!slot) {
    return {
      ok: false,
      code: "SLOT_INVALID",
      message: "That time is not available. Please choose another slot.",
    };
  }

  /*
   * The duration and buffer come from the booking, not from the freshly
   * resolved slot. They were snapshotted when it was made, alongside the price,
   * and the catalogue may have been edited since — a customer who moves their
   * appointment to Thursday should not silently find it is now fifteen minutes
   * shorter. `resolveSlot` is used here to validate that the new start is a
   * real, bookable time and to decide which therapist takes it, nothing more.
   *
   * The price is untouched for the same reason: `priceIdrAtBooking` is what the
   * confirmation email said, and changing the day does not change what was
   * quoted.
   */
  const endAt = addMinutes(
    input.startAt,
    booking.durationMinutes + booking.bufferMinutes,
  );

  /*
   * The exclusion constraint is the real guarantee and will reject the UPDATE
   * below regardless. This check runs first only so the common case — the slot
   * was taken a minute ago and the calendar the customer is looking at is
   * stale — produces a clear answer rather than a caught database error. The
   * booking excludes itself: moving it by fifteen minutes overlaps its own
   * current range, which is not a conflict.
   */
  const free = await isTherapistFree({
    therapistId: slot.therapistId,
    startAt: input.startAt,
    endAt,
    excludeBookingId: booking.id,
  });

  if (!free) {
    return {
      ok: false,
      code: "SLOT_TAKEN",
      message: "That time has just been taken. Please choose another slot.",
    };
  }

  const previousStart = booking.startAt;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          therapistId: slot.therapistId,
          startAt: input.startAt,
          endAt,
          /* Rises on every change so the second .ics updates the event already
             in the customer's calendar instead of adding a duplicate beside
             it. This is the whole reason the column exists. */
          icsSequence: { increment: 1 },
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: auditData({
          actor: input.by,
          action: "booking.rescheduled",
          bookingId: booking.id,
          meta: {
            from: previousStart.toISOString(),
            to: input.startAt.toISOString(),
            fromTherapistId: booking.therapistId,
            toTherapistId: slot.therapistId,
          },
        }),
      });
    });
  } catch (error) {
    if (isSlotTakenError(error)) {
      return {
        ok: false,
        code: "SLOT_TAKEN",
        message: "That time has just been taken. Please choose another slot.",
      };
    }

    console.error("[booking] reschedule failed", error);

    return {
      ok: false,
      code: "SERVER",
      message: "We could not move that booking. Please try again.",
    };
  }

  return reload(booking.id);
}

// ── Arbitrary status changes ──────────────────────────────────────────────

export async function setBookingStatus(input: {
  bookingId: string;
  status: BookingStatusValue;
  by: Actor;
  reason?: string | null;
  now?: Date;
}): Promise<TransitionResult> {
  /* Cancelling is not just a status: it also stamps who did it and why, and
     bumps the sequence so the calendar cancellation is accepted. Routed here so
     no caller can produce a half-cancelled booking by taking the short path. */
  if (input.status === BookingStatus.CANCELLED) {
    return cancelBooking({
      bookingId: input.bookingId,
      by: input.by,
      reason: input.reason,
      now: input.now,
    });
  }

  /* The only status a customer may set is CANCELLED, above. Everything else —
     marking a session complete, recording a no-show, confirming a held booking
     once payment clears — belongs to the studio. */
  if (input.by === "customer") {
    return {
      ok: false,
      code: "VALIDATION",
      message: "That change is not something you can make yourself.",
    };
  }

  const booking = await loadBookingById(input.bookingId);

  if (!booking) return NOT_FOUND;
  if (booking.status === BookingStatus.CANCELLED) return ALREADY_CANCELLED;
  /* Idempotent: the payment webhook that will call this can and will arrive
     twice for the same event. */
  if (booking.status === input.status) return { ok: true, booking };

  await prisma.$transaction(async (tx) => {
    /* No `icsSequence` bump: only a change to what the customer's calendar
       should say needs one, and none of these are — a completed session is
       still the same event at the same time. */
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: input.status },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: auditData({
        actor: input.by,
        action: "booking.status",
        bookingId: booking.id,
        meta: {
          from: booking.status,
          to: input.status,
          reason: input.reason?.trim() || null,
        },
      }),
    });
  });

  return reload(booking.id);
}

// ── Payment holds ─────────────────────────────────────────────────────────

/*
 * The two ends of the online payment path: money arrived, or it never did.
 *
 * Both are called from a place that has no user in front of it — a gateway
 * callback and a cron sweep — and both can be called more than once for the
 * same event. Xendit retries a callback until it gets a 200 and will happily
 * deliver the same status twice (PAYMENT-PLAN.md §5 rule 4), so "already done"
 * has to be a success that writes nothing rather than an error or a second
 * audit row.
 *
 * That is why neither of these reads a booking and then writes it. Each one
 * updates conditionally on the status it expects to still find, the way
 * `claim()` does in the notification queue: whichever caller's UPDATE still
 * matches gets to act, and the loser matches nothing and does nothing. Two
 * callbacks landing together cannot both confirm the same booking.
 *
 * Neither bumps `icsSequence`, and that is not an oversight. A held booking has
 * never sent anyone a calendar invitation — the confirmation with its `.ics`
 * is queued only once this returns `ok` — so there is no event in anyone's
 * calendar for a higher sequence to supersede.
 */

/** One sweep's worth. The cron runs often; an unbounded run is a timeout. */
const SWEEP_LIMIT = 200;

/**
 * The payment-facing columns, which `LoadedBooking` does not carry.
 *
 * `lib/booking/view.ts` builds what a customer is shown, and no customer
 * surface has any use for a hold expiry — so these are read separately rather
 * than widening the view every page in the site renders from.
 */
async function holdState(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      amountPaidIdr: true,
      holdExpiresAt: true,
    },
  });
}

/**
 * Money arrived. Confirms the booking and releases its hold.
 *
 * Idempotent: calling it again with the same amount finds nothing to change
 * and returns the booking as it stands.
 *
 * `by` distinguishes the two ways this happens — `"customer"` when the gateway
 * reports their own payment cleared, `"admin"` when a member of staff records
 * cash taken at the desk. Both are real payments; the audit trail should not
 * have to guess which.
 */
export async function markBookingPaid(input: {
  bookingId: string;
  amountPaidIdr: number;
  by: Actor;
  now?: Date;
}): Promise<TransitionResult> {
  const state = await holdState(input.bookingId);

  if (!state) return NOT_FOUND;

  /*
   * Money against a booking that is already cancelled — the hold lapsed
   * seconds before the callback landed, or the studio cancelled by hand while
   * the customer was paying. Refused rather than quietly confirmed: the slot
   * may belong to somebody else by now, and re-confirming would double-book a
   * therapist to hide a refund. The caller is expected to record that the
   * studio owes this money back. PAYMENT-PLAN.md §11 risk 3.
   */
  if (state.status === BookingStatus.CANCELLED) return ALREADY_CANCELLED;

  /*
   * A session that has already been given, being paid for afterwards, stays
   * where it is. Moving a COMPLETED booking back to CONFIRMED would put a
   * finished appointment back on tomorrow's agenda; the amount is still
   * recorded, which is the part that matters to the books.
   */
  const nextStatus =
    state.status === BookingStatus.COMPLETED ||
    state.status === BookingStatus.NO_SHOW
      ? state.status
      : BookingStatus.CONFIRMED;

  /* Nothing left to do. No audit row, and no `updatedAt` bump that would make
     a duplicate callback look in the admin panel like something moved. */
  if (
    state.status === nextStatus &&
    state.amountPaidIdr === input.amountPaidIdr &&
    state.holdExpiresAt === null
  ) {
    return reload(state.id);
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: state.id, status: state.status },
      data: {
        status: nextStatus,
        amountPaidIdr: input.amountPaidIdr,
        /* The hold has done its work. Clearing it keeps the sweeper away from
           a booking that is now paid for, whatever the clock says. */
        holdExpiresAt: null,
      },
    });

    /* Somebody else moved this row between the read above and here. Their
       write is the one that stands; this one writes nothing at all. */
    if (updated.count === 0) return;

    await tx.auditLog.create({
      data: auditData({
        actor: input.by,
        action: "booking.paid",
        bookingId: state.id,
        meta: {
          amountPaidIdr: input.amountPaidIdr,
          previousStatus: state.status,
          previousAmountPaidIdr: state.amountPaidIdr,
        },
      }),
    });
  });

  return reload(state.id);
}

/**
 * Cancel a lapsed hold, and report whether this call is the one that did it.
 *
 * The boolean is what `sweepExpiredHolds` counts. It cannot be recovered from
 * a `TransitionResult`, which says what the booking is now and not who put it
 * there — and "already cancelled" has to read as success here, or a second
 * sweep over the same row would look like a failure.
 */
async function releaseHold(
  bookingId: string,
  reason: string,
  now: Date,
): Promise<{ changed: boolean; result: TransitionResult }> {
  const state = await holdState(bookingId);

  if (!state) return { changed: false, result: NOT_FOUND };

  /*
   * Only a booking still waiting for money is freed, and the half that matters
   * is what this refuses. A customer who lets a QRIS code lapse and then pays
   * by bank transfer has a CONFIRMED booking and an abandoned first charge
   * that reports EXPIRED minutes later. Acting on that callback would cancel
   * an appointment somebody has paid for.
   */
  if (state.status !== BookingStatus.AWAITING_PAYMENT) {
    return { changed: false, result: await reload(bookingId) };
  }

  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: BookingStatus.AWAITING_PAYMENT },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        /* Not `"customer"` and not `"admin"`. Nobody cancelled this; the clock
           ran out, and the admin panel should say so. */
        cancelledBy: "system",
        cancelReason: reason,
        /* `holdExpiresAt` is deliberately left standing: it is the record of
           when the money was due, and the sweeper filters on status anyway. */
      },
    });

    /* A callback confirmed this between the read above and here. Whoever won
       the UPDATE owns the outcome; this call writes nothing and reports that
       it changed nothing. */
    if (updated.count === 0) return false;

    await tx.auditLog.create({
      data: auditData({
        actor: "system",
        action: "booking.hold_expired",
        bookingId,
        meta: { reason, expiredAt: now.toISOString() },
      }),
    });

    return true;
  });

  return { changed, result: await reload(bookingId) };
}

/**
 * The hold lapsed or the charge failed. Frees the slot.
 *
 * Idempotent, and safe to call on a booking that was never held: anything not
 * sitting in `AWAITING_PAYMENT` is returned untouched.
 *
 * No notification is queued, here or by the caller. Nothing was ever sent to
 * the customer about a booking they did not pay for, so there is nothing to
 * take back — they are still looking at the payment modal, which will tell
 * them the charge expired and offer to try again.
 */
export async function expireBookingHold(input: {
  bookingId: string;
  reason: string;
  now?: Date;
}): Promise<TransitionResult> {
  const now = input.now ?? new Date();
  const reason = input.reason.trim() || "The payment hold expired.";
  const { result } = await releaseHold(input.bookingId, reason, now);
  return result;
}

/**
 * Every `AWAITING_PAYMENT` booking past its hold. For the cron.
 *
 * This is what actually frees a slot when somebody opens the payment modal and
 * walks away — the gateway's own expiry callback usually arrives first, but it
 * is a message from another company's server and cannot be relied on. The
 * booking's own clock is the backstop, which is why `holdExpiresAt` is set
 * longer than the charge's expiry (PAYMENT-PLAN.md §11 risk 3).
 */
export async function sweepExpiredHolds(
  now: Date = new Date(),
): Promise<{ expired: number }> {
  const lapsed = await prisma.booking.findMany({
    where: {
      status: BookingStatus.AWAITING_PAYMENT,
      holdExpiresAt: { lte: now },
    },
    select: { id: true },
    orderBy: { holdExpiresAt: "asc" },
    take: SWEEP_LIMIT,
  });

  let expired = 0;

  for (const booking of lapsed) {
    const { changed } = await releaseHold(
      booking.id,
      "Payment was not completed before the hold ran out.",
      now,
    );
    if (changed) expired += 1;
  }

  return { expired };
}
