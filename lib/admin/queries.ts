/**
 * Every read the admin panel makes.
 *
 * Pages stay declarative and this file owns the Prisma. Two rules it keeps so
 * the panel cannot contradict the rest of the product:
 *
 * - Bookings come back through `toBookingSummary` / `toBookingView`, the same
 *   mapping the emails and the customer's own pages use. An admin looking at a
 *   session must see the times and the price the customer was told, including
 *   the detail that the customer-facing end excludes the clean-down buffer.
 * - A studio day is a studio day. Every date boundary goes through
 *   `studioDayStart` / `studioDayEnd`, never through the server's midnight,
 *   which in UTC lands at 08:00 WITA — in the middle of the morning's
 *   appointments.
 */
import "server-only";

import { BookingStatus } from "@/generated/prisma/enums";
import {
  bookingInclude,
  toBookingSummary,
  toBookingView,
} from "@/lib/booking/view";
import {
  addStudioDays,
  studioDateKey,
  studioDayEnd,
  studioDayStart,
  type IsoDate,
} from "@/lib/booking/time";
import type {
  BookingStatusValue,
  BookingSummary,
  BookingView,
  Tier,
} from "@/lib/booking/types";
import { prisma } from "@/lib/db";

/** Cancelled sessions do not count towards a day's workload or takings. */
const LIVE_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

export const BOOKINGS_PAGE_SIZE = 25;

// ── Today's agenda ────────────────────────────────────────────────────────

export type Agenda = {
  date: IsoDate;
  tomorrow: IsoDate;
  bookings: BookingSummary[];
  todayCount: number;
  tomorrowCount: number;
  /** Today's confirmed and completed takings, at the price each was booked at. */
  todayValueIdr: number;
};

export async function loadAgenda(now: Date = new Date()): Promise<Agenda> {
  const date = studioDateKey(now);
  const tomorrow = addStudioDays(date, 1);

  const [rows, tomorrowCount] = await Promise.all([
    prisma.booking.findMany({
      where: {
        startAt: { gte: studioDayStart(date), lt: studioDayEnd(date) },
      },
      orderBy: { startAt: "asc" },
      include: bookingInclude,
    }),
    prisma.booking.count({
      where: {
        startAt: { gte: studioDayStart(tomorrow), lt: studioDayEnd(tomorrow) },
        status: { in: LIVE_STATUSES },
      },
    }),
  ]);

  const bookings = rows.map(toBookingSummary);
  const live = bookings.filter(
    (booking) =>
      booking.status !== "CANCELLED" && booking.status !== "NO_SHOW",
  );

  return {
    date,
    tomorrow,
    bookings,
    todayCount: live.length,
    tomorrowCount,
    todayValueIdr: live.reduce((total, booking) => total + booking.priceIdr, 0),
  };
}

// ── Bookings list ─────────────────────────────────────────────────────────

export type BookingFilters = {
  from: IsoDate | null;
  to: IsoDate | null;
  therapistId: string | null;
  status: BookingStatusValue | null;
  page: number;
};

export type BookingPage = {
  bookings: BookingSummary[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listBookings(
  filters: BookingFilters,
): Promise<BookingPage> {
  const page = Math.max(1, filters.page);

  const startAt =
    filters.from || filters.to
      ? {
          ...(filters.from ? { gte: studioDayStart(filters.from) } : {}),
          /* Exclusive end of the *last* day, so a range whose two dates are
             the same still returns that whole day rather than nothing. */
          ...(filters.to ? { lt: studioDayEnd(filters.to) } : {}),
        }
      : undefined;

  const where = {
    ...(startAt ? { startAt } : {}),
    ...(filters.therapistId ? { therapistId: filters.therapistId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: (page - 1) * BOOKINGS_PAGE_SIZE,
      take: BOOKINGS_PAGE_SIZE,
      include: bookingInclude,
    }),
  ]);

  return {
    bookings: rows.map(toBookingSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE)),
  };
}

// ── One booking ───────────────────────────────────────────────────────────

export type NotificationJobRow = {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  kind: string;
  target: string;
  status: "PENDING" | "SENT" | "FAILED" | "DEAD";
  attempts: number;
  lastError: string | null;
  scheduledAt: Date;
  sentAt: Date | null;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  createdAt: Date;
};

export type BookingDetail = {
  view: BookingView;
  therapistId: string;
  variantId: string;
  /**
   * Why the customer says they never heard from you. Every message this
   * booking should have sent, with its attempts and the error that stopped it
   * — the one screen that turns "WhatsApp is broken" into a specific fact.
   */
  jobs: NotificationJobRow[];
  audit: AuditEntry[];
};

export async function loadBookingDetail(
  id: string,
): Promise<BookingDetail | null> {
  const row = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });

  if (!row) return null;

  const [jobs, audit] = await Promise.all([
    prisma.notificationJob.findMany({
      where: { bookingId: id },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.auditLog.findMany({
      where: { entity: "Booking", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    view: toBookingView(row),
    therapistId: row.therapistId,
    variantId: row.variantId,
    jobs,
    audit: audit.map((entry) => ({
      id: entry.id,
      actor: entry.actor,
      action: entry.action,
      createdAt: entry.createdAt,
    })),
  };
}

// ── Schedule ──────────────────────────────────────────────────────────────

export type WorkingHourRow = {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type TherapistSchedule = {
  id: string;
  name: string;
  displayName: string;
  tier: Tier;
  active: boolean;
  workingHours: WorkingHourRow[];
};

export type TimeOffRow = {
  id: string;
  therapistId: string | null;
  therapistName: string | null;
  startAt: Date;
  endAt: Date;
  reason: string | null;
};

export type ScheduleData = {
  therapists: TherapistSchedule[];
  timeOff: TimeOffRow[];
};

export async function loadSchedule(now: Date = new Date()): Promise<ScheduleData> {
  const [therapists, timeOff] = await Promise.all([
    prisma.therapist.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        workingHours: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
      },
    }),
    prisma.timeOff.findMany({
      /* Anything still running or still to come. Last year's leave is history
         nobody edits, and listing it buries the entries that matter. */
      where: { endAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: { therapist: { select: { name: true } } },
    }),
  ]);

  return {
    therapists: therapists.map((therapist) => ({
      id: therapist.id,
      name: therapist.name,
      displayName: therapist.displayName,
      tier: therapist.tier,
      active: therapist.active,
      workingHours: therapist.workingHours.map((hour) => ({
        id: hour.id,
        weekday: hour.weekday,
        startMinute: hour.startMinute,
        endMinute: hour.endMinute,
      })),
    })),
    timeOff: timeOff.map((entry) => ({
      id: entry.id,
      therapistId: entry.therapistId,
      therapistName: entry.therapist?.name ?? null,
      startAt: entry.startAt,
      endAt: entry.endAt,
      reason: entry.reason,
    })),
  };
}

/**
 * Bookings a proposed block of time off would sit on top of.
 *
 * Time off is never refused because of these — a therapist who is ill is ill,
 * and the studio still has to be told which four people to ring. The warning
 * is the point; blocking would only push the entry into someone's head.
 */
export async function bookingsCoveredBy(input: {
  therapistId: string | null;
  startAt: Date;
  endAt: Date;
}): Promise<BookingSummary[]> {
  const rows = await prisma.booking.findMany({
    where: {
      ...(input.therapistId ? { therapistId: input.therapistId } : {}),
      status: { in: LIVE_STATUSES },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    orderBy: { startAt: "asc" },
    include: bookingInclude,
  });

  return rows.map(toBookingSummary);
}

export type TimeOffWithConflicts = TimeOffRow & {
  conflicts: BookingSummary[];
};

/**
 * Each block of time off with the bookings sitting inside it.
 *
 * Time off is entered after the fact — somebody is ill this morning — so it
 * routinely lands on top of sessions that are already in the diary. Saving it
 * does not touch them, which is correct: only a person can decide whether to
 * move a customer or ring them. But the panel has to say which four people
 * that is, on the same screen, or the entry gets made and the calls do not.
 */
export async function loadTimeOffConflicts(
  entries: TimeOffRow[],
): Promise<TimeOffWithConflicts[]> {
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      conflicts: await bookingsCoveredBy({
        therapistId: entry.therapistId,
        startAt: entry.startAt,
        endAt: entry.endAt,
      }),
    })),
  );
}

// ── Services ──────────────────────────────────────────────────────────────

export type VariantRow = {
  id: string;
  tier: Tier;
  durationMinutes: number;
  priceIdr: number;
  active: boolean;
  bookingCount: number;
};

export type ServiceRow = {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  bufferMinutes: number;
  variants: VariantRow[];
};

export async function loadServices(): Promise<ServiceRow[]> {
  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      variants: {
        orderBy: [{ tier: "asc" }, { durationMinutes: "asc" }],
        include: { _count: { select: { bookings: true } } },
      },
    },
  });

  return services.map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title,
    active: service.active,
    bufferMinutes: service.bufferMinutes,
    variants: service.variants.map((variant) => ({
      id: variant.id,
      tier: variant.tier,
      durationMinutes: variant.durationMinutes,
      priceIdr: variant.priceIdr,
      active: variant.active,
      bookingCount: variant._count.bookings,
    })),
  }));
}

// ── Notifications ─────────────────────────────────────────────────────────

export type TroubleJobRow = NotificationJobRow & {
  bookingId: string;
  reference: string;
  createdAt: Date;
};

export type NotificationHealth = {
  pending: number;
  failed: number;
  dead: number;
  trouble: TroubleJobRow[];
};

export async function loadNotificationHealth(): Promise<NotificationHealth> {
  const [pending, failed, dead, rows] = await Promise.all([
    prisma.notificationJob.count({ where: { status: "PENDING" } }),
    prisma.notificationJob.count({ where: { status: "FAILED" } }),
    prisma.notificationJob.count({ where: { status: "DEAD" } }),
    prisma.notificationJob.findMany({
      where: { status: { in: ["FAILED", "DEAD"] } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { booking: { select: { reference: true } } },
    }),
  ]);

  return {
    pending,
    failed,
    dead,
    trouble: rows.map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      reference: row.booking.reference,
      channel: row.channel,
      kind: row.kind,
      target: row.target,
      status: row.status,
      attempts: row.attempts,
      lastError: row.lastError,
      scheduledAt: row.scheduledAt,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    })),
  };
}

// ── Shared lookups ────────────────────────────────────────────────────────

export type TherapistOption = {
  id: string;
  name: string;
  displayName: string;
  tier: Tier;
  active: boolean;
};

/** Every therapist, deactivated ones included: their old bookings still filter. */
export async function listTherapistOptions(): Promise<TherapistOption[]> {
  const rows = await prisma.therapist.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      displayName: true,
      tier: true,
      active: true,
    },
  });

  return rows;
}
