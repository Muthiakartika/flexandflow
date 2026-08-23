/**
 * Availability against the database.
 *
 * This module is the only place that knows how "who is free at 10:30 on the
 * 25th" is assembled: it loads working hours, bookings and time off, hands the
 * arithmetic to `lib/booking/availability.ts`, and merges the per-therapist
 * results into the shape the wizard and the API render.
 *
 * `resolveSlot` is the load-bearing one. The wizard's slot list is a snapshot
 * that may be minutes old by the time someone presses Confirm, so nothing the
 * client sends about a slot — therapist, price, duration — is trusted; it is
 * all recomputed here, and the Postgres exclusion constraint catches the last
 * few milliseconds this cannot.
 */
import "server-only";

import { BookingStatus } from "@/generated/prisma/enums";
import {
  slotCandidates,
  type BusyInterval,
  type WorkingBlock,
} from "@/lib/booking/availability";
import {
  addStudioDays,
  STUDIO_TZ,
  studioDateKey,
  studioDayEnd,
  studioDayStart,
  studioMonthDays,
  studioWeekday,
  type IsoDate,
} from "@/lib/booking/time";
import {
  ANY_STAFF,
  DAY_PART_LABEL,
  dayPartFor,
  type DayAvailability,
  type DayPart,
  type MonthAvailability,
  type Slot,
  type SlotGroup,
  type StaffSelection,
} from "@/lib/booking/types";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * A booking only holds its slot while it is live. Cancelling frees it again.
 *
 * This list must stay identical to the `WHERE` clause of the `booking_no_overlap`
 * constraint, in `prisma/migrations/*_hold_blocks_slot/`. They are two halves of
 * one rule: this half decides what is offered, that half decides what may be
 * written, and the moment this one is the more permissive of the two the wizard
 * starts offering times that Postgres will refuse at the last step — after the
 * customer has filled in every field.
 *
 * `AWAITING_PAYMENT` is included with no regard for whether the hold has
 * lapsed, again because the constraint does not look either. An expired hold
 * really does still block the insert until the cron cancels it, so showing that
 * time as free would be showing something untrue. That makes the sweep interval
 * in `.github/workflows/booking-cron.yml` the thing that decides how long an
 * abandoned payment keeps a slot dark; see CRON.md.
 */
const BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.CONFIRMED,
];

const DAY_PART_ORDER: DayPart[] = ["morning", "afternoon", "evening"];

export type ResolvedSlot = {
  therapistId: string;
  variantId: string;
  startAt: Date;
  /** Includes `bufferMinutes`. This is what belongs in `Booking.endAt`. */
  endAt: Date;
  /** The session length the customer booked, buffer excluded. */
  durationMinutes: number;
  bufferMinutes: number;
  priceIdr: number;
};

type TherapistRow = { id: string; sortOrder: number };
type WorkingHourRow = {
  therapistId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
};
type BookingRow = { therapistId: string; startAt: Date; endAt: Date };
type TimeOffRow = { therapistId: string | null; startAt: Date; endAt: Date };

/** Everything a day's computation needs that does not depend on the date. */
type Context = {
  variantId: string;
  durationMinutes: number;
  bufferMinutes: number;
  priceIdr: number;
  therapists: TherapistRow[];
  stepMinutes: number;
  leadTimeMinutes: number;
};

/**
 * The variant plus the therapists who may actually deliver it: linked to its
 * service, active, and on the variant's tier — the tier lives on the therapist
 * (BOOKING-PLAN §2.2), so a Master and a Standard never share a price row.
 *
 * Returns null when the variant is gone or retired. An empty `therapists` list
 * is a different thing and is allowed: it means nobody can serve this request,
 * which is what a named-therapist selection produces when that therapist is not
 * eligible for the variant.
 */
async function loadContext(
  staff: StaffSelection,
  variantId: string,
): Promise<Context | null> {
  const variant = await prisma.serviceVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      tier: true,
      serviceId: true,
      durationMinutes: true,
      priceIdr: true,
      active: true,
      service: { select: { bufferMinutes: true, active: true } },
    },
  });

  if (!variant || !variant.active || !variant.service.active) return null;

  const therapists = await prisma.therapist.findMany({
    where: {
      active: true,
      tier: variant.tier,
      services: { some: { serviceId: variant.serviceId } },
      ...(staff === ANY_STAFF ? {} : { id: staff }),
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const { BOOKING_SLOT_STEP_MINUTES, BOOKING_LEAD_TIME_MINUTES } = env();

  return {
    variantId: variant.id,
    durationMinutes: variant.durationMinutes,
    bufferMinutes: variant.service.bufferMinutes,
    priceIdr: variant.priceIdr,
    therapists,
    stepMinutes: BOOKING_SLOT_STEP_MINUTES,
    leadTimeMinutes: BOOKING_LEAD_TIME_MINUTES,
  };
}

/**
 * Merge one day of per-therapist candidates into the slot list the UI shows.
 *
 * No I/O here: every row passed in is already narrowed to `date`, which is what
 * lets `monthAvailability` call this thirty-one times off a single query set.
 *
 * Slots nobody is free for come back with `slotsLeft: 0` rather than being
 * dropped. The old flow rendered them greyed out and labelled "0 Slots left",
 * which tells a customer the studio is busy at 10:30 instead of quietly making
 * 10:30 vanish — visibly different, and the behaviour the owner already has.
 */
function buildDay(input: {
  date: IsoDate;
  context: Context;
  workingHours: WorkingHourRow[];
  bookings: BookingRow[];
  timeOff: TimeOffRow[];
  now: Date;
}): Slot[] {
  const { date, context, workingHours, bookings, timeOff, now } = input;
  const { durationMinutes, bufferMinutes, stepMinutes, leadTimeMinutes } =
    context;

  /** Assignment preference: spread work rather than always picking the first. */
  const rank = new Map<string, number>();
  const load = new Map<string, number>();
  for (const therapist of context.therapists) {
    load.set(
      therapist.id,
      bookings.filter((row) => row.therapistId === therapist.id).length,
    );
  }
  [...context.therapists]
    .sort((a, b) => {
      const byLoad = (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0);
      if (byLoad !== 0) return byLoad;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    })
    .forEach((therapist, index) => rank.set(therapist.id, index));

  const merged = new Map<
    number,
    { startAt: Date; endAt: Date; endMinute: number; free: string[] }
  >();

  for (const therapist of context.therapists) {
    const workingBlocks: WorkingBlock[] = workingHours
      .filter((row) => row.therapistId === therapist.id)
      .map((row) => ({
        startMinute: row.startMinute,
        endMinute: row.endMinute,
      }));

    if (workingBlocks.length === 0) continue;

    // A null `therapistId` on time off closes the studio, so it counts against
    // everyone rather than against nobody.
    const busy: BusyInterval[] = [
      ...bookings.filter((row) => row.therapistId === therapist.id),
      ...timeOff.filter(
        (row) => row.therapistId === null || row.therapistId === therapist.id,
      ),
    ];

    const shared = {
      date,
      workingBlocks,
      durationMinutes,
      bufferMinutes,
      stepMinutes,
      leadTimeMinutes,
      now,
    };

    // Two passes on purpose. The first is what this therapist's roster offers
    // at all, which is what keeps a fully-booked time on screen; the second is
    // what they can still take.
    const offered = slotCandidates({ ...shared, busy: [] });
    const free = new Set(
      slotCandidates({ ...shared, busy }).map(
        (candidate) => candidate.startMinute,
      ),
    );

    for (const candidate of offered) {
      const entry = merged.get(candidate.startMinute) ?? {
        startAt: candidate.startAt,
        endAt: candidate.endAt,
        endMinute: candidate.endMinute,
        free: [],
      };
      if (free.has(candidate.startMinute)) entry.free.push(therapist.id);
      merged.set(candidate.startMinute, entry);
    }
  }

  return [...merged.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startMinute, entry]) => ({
      startAt: entry.startAt.toISOString(),
      endAt: entry.endAt.toISOString(),
      startMinute,
      endMinute: entry.endMinute,
      dayPart: dayPartFor(startMinute),
      slotsLeft: entry.free.length,
      therapistIds: entry.free.sort(
        (a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0),
      ),
    }));
}

/** The three day queries, all scoped to one studio-local calendar day. */
async function loadDay(context: Context, date: IsoDate) {
  const therapistIds = context.therapists.map((therapist) => therapist.id);
  const dayStart = studioDayStart(date);
  const dayEnd = studioDayEnd(date);
  const weekday = studioWeekday(date);

  const [workingHours, bookings, timeOff] = await Promise.all([
    prisma.workingHour.findMany({
      where: { therapistId: { in: therapistIds }, weekday },
      select: {
        therapistId: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        therapistId: { in: therapistIds },
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { therapistId: true, startAt: true, endAt: true },
    }),
    prisma.timeOff.findMany({
      where: {
        OR: [{ therapistId: { in: therapistIds } }, { therapistId: null }],
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { therapistId: true, startAt: true, endAt: true },
    }),
  ]);

  return { workingHours, bookings, timeOff };
}

function group(slots: Slot[]): SlotGroup[] {
  return DAY_PART_ORDER.flatMap((dayPart) => {
    const inPart = slots.filter((slot) => slot.dayPart === dayPart);
    return inPart.length
      ? [{ dayPart, label: DAY_PART_LABEL[dayPart], slots: inPart }]
      : [];
  });
}

export async function slotsForDay(input: {
  staff: StaffSelection;
  variantId: string;
  date: IsoDate;
  now?: Date;
}): Promise<SlotGroup[]> {
  const now = input.now ?? new Date();
  const context = await loadContext(input.staff, input.variantId);
  if (!context || context.therapists.length === 0) return [];

  const { workingHours, bookings, timeOff } = await loadDay(context, input.date);

  return group(
    buildDay({ date: input.date, context, workingHours, bookings, timeOff, now }),
  );
}

export async function monthAvailability(input: {
  staff: StaffSelection;
  variantId: string;
  month: string;
  now?: Date;
}): Promise<MonthAvailability> {
  const now = input.now ?? new Date();
  const days = studioMonthDays(input.month);

  if (days.length === 0) {
    return { month: input.month, timezone: STUDIO_TZ, days: [] };
  }

  const context = await loadContext(input.staff, input.variantId);

  // Nobody eligible is indistinguishable from the studio being shut, as far as
  // this calendar is concerned: no cell is clickable either way.
  if (!context || context.therapists.length === 0) {
    return {
      month: input.month,
      timezone: STUDIO_TZ,
      days: days.map((date) => ({
        date,
        closed: true,
        full: false,
        outOfRange: false,
        slotCount: 0,
      })),
    };
  }

  const therapistIds = context.therapists.map((therapist) => therapist.id);
  const monthStart = studioDayStart(days[0]);
  const monthEnd = studioDayEnd(days[days.length - 1]);

  // One query set for the whole month. Thirty round trips to colour a calendar
  // grid is the difference between a snappy month change and a visible stall.
  const [workingHours, bookings, timeOff] = await Promise.all([
    prisma.workingHour.findMany({
      where: { therapistId: { in: therapistIds } },
      select: {
        therapistId: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        therapistId: { in: therapistIds },
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: monthEnd },
        endAt: { gt: monthStart },
      },
      select: { therapistId: true, startAt: true, endAt: true },
    }),
    prisma.timeOff.findMany({
      where: {
        OR: [{ therapistId: { in: therapistIds } }, { therapistId: null }],
        startAt: { lt: monthEnd },
        endAt: { gt: monthStart },
      },
      select: { therapistId: true, startAt: true, endAt: true },
    }),
  ]);

  const lastBookable = addStudioDays(
    studioDateKey(now),
    env().BOOKING_MAX_ADVANCE_DAYS,
  );
  const earliest = now.getTime() + context.leadTimeMinutes * 60_000;

  const result: DayAvailability[] = days.map((date) => {
    const dayStart = studioDayStart(date);
    const dayEnd = studioDayEnd(date);

    // Comparing `IsoDate` as strings is safe — fixed width, most significant
    // field first — and saves another timezone conversion per cell.
    const outOfRange = date > lastBookable || dayEnd.getTime() <= earliest;

    // The row volume here is one small studio's month, so a linear scan per day
    // costs less than the bookkeeping needed to avoid it.
    const dayBookings = bookings.filter(
      (row) =>
        row.startAt.getTime() < dayEnd.getTime() &&
        row.endAt.getTime() > dayStart.getTime(),
    );
    const dayTimeOff = timeOff.filter(
      (row) =>
        row.startAt.getTime() < dayEnd.getTime() &&
        row.endAt.getTime() > dayStart.getTime(),
    );

    const weekday = studioWeekday(date);
    const dayHours = workingHours.filter((row) => row.weekday === weekday);

    const studioShut = dayTimeOff.some(
      (row) =>
        row.therapistId === null &&
        row.startAt.getTime() <= dayStart.getTime() &&
        row.endAt.getTime() >= dayEnd.getTime(),
    );

    const closed = dayHours.length === 0 || studioShut;

    if (closed || outOfRange) {
      return { date, closed, full: false, outOfRange, slotCount: 0 };
    }

    const slots = buildDay({
      date,
      context,
      workingHours: dayHours,
      bookings: dayBookings,
      timeOff: dayTimeOff,
      now,
    });

    // Only bookable starts count. The zero-left ones exist for the day view; a
    // cell made of nothing but those is `full`, not available.
    const slotCount = slots.filter((slot) => slot.slotsLeft > 0).length;

    return { date, closed: false, full: slotCount === 0, outOfRange, slotCount };
  });

  return { month: input.month, timezone: STUDIO_TZ, days: result };
}

/**
 * The re-check that stands between a submitted form and a written booking.
 *
 * Duration, buffer and price come from the catalogue, never from the request —
 * a client that posts its own price gets the catalogue's price anyway.
 */
export async function resolveSlot(input: {
  staff: StaffSelection;
  variantId: string;
  startAt: Date;
  now?: Date;
}): Promise<ResolvedSlot | null> {
  const now = input.now ?? new Date();
  const context = await loadContext(input.staff, input.variantId);
  if (!context || context.therapists.length === 0) return null;

  const date = studioDateKey(input.startAt);
  const { workingHours, bookings, timeOff } = await loadDay(context, date);
  const slots = buildDay({
    date,
    context,
    workingHours,
    bookings,
    timeOff,
    now,
  });

  const wanted = input.startAt.getTime();
  const slot = slots.find(
    (candidate) => Date.parse(candidate.startAt) === wanted,
  );
  if (!slot || slot.slotsLeft === 0) return null;

  // With "Any Staff" the first id is the least-loaded therapist. With a named
  // one, they have to still be free at this instant, not merely eligible.
  const therapistId =
    input.staff === ANY_STAFF
      ? slot.therapistIds[0]
      : slot.therapistIds.find((id) => id === input.staff);
  if (!therapistId) return null;

  return {
    therapistId,
    variantId: context.variantId,
    startAt: new Date(wanted),
    // `slot.endAt` already carries the buffer, which is what the exclusion
    // constraint compares. The customer-facing session ends `durationMinutes`
    // after `startAt` — earlier than this, and never stored.
    endAt: new Date(slot.endAt),
    durationMinutes: context.durationMinutes,
    bufferMinutes: context.bufferMinutes,
    priceIdr: context.priceIdr,
  };
}

/**
 * A direct collision check, for the admin panel moving a booking to a time no
 * slot grid ever offered. `excludeBookingId` stops a booking colliding with
 * itself when it is only being nudged.
 *
 * `endAt` must already include the buffer, matching `Booking.endAt`.
 */
export async function isTherapistFree(input: {
  therapistId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
}): Promise<boolean> {
  const { therapistId, startAt, endAt, excludeBookingId } = input;

  const [conflicts, absences] = await Promise.all([
    prisma.booking.count({
      where: {
        therapistId,
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    }),
    prisma.timeOff.count({
      where: {
        OR: [{ therapistId }, { therapistId: null }],
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    }),
  ]);

  return conflicts === 0 && absences === 0;
}
