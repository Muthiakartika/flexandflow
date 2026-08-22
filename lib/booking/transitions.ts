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

type AuditEntry = {
  actor: Actor;
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
