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

import { BookingStatus, PaymentMethod } from "@/generated/prisma/enums";
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
import type {
  PaymentMethodValue,
  PaymentSummary,
} from "@/lib/payments/types";

/** Cancelled sessions do not count towards a day's workload or takings. */
const LIVE_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

export const BOOKINGS_PAGE_SIZE = 25;

// ── Money ─────────────────────────────────────────────────────────────────

/**
 * Where one booking stands financially, in the one word a person needs.
 *
 * Deliberately not the same thing as `Payment.status`: a booking can have two
 * charges — a QRIS code that expired and a bank transfer that worked — and the
 * desk does not care about either row, only about whether the money is in.
 */
export type PaymentState =
  | "AT_STUDIO"
  | "UNPAID"
  | "PART_PAID"
  | "PAID"
  | "PART_REFUNDED"
  | "REFUNDED";

/** The three columns every payment tally is worked out from. */
const paymentTallySelect = {
  amountPaidIdr: true,
  refundedIdr: true,
} as const;

/** Everything the booking detail page prints about one charge. */
const paymentSelect = {
  id: true,
  channel: true,
  status: true,
  amountIdr: true,
  amountPaidIdr: true,
  refundedIdr: true,
  refundedAt: true,
  refundNote: true,
  expiresAt: true,
  paidAt: true,
  createdAt: true,
  lastError: true,
} as const;

type PaymentTally = { amountPaidIdr: number; refundedIdr: number };

type PaidBookingRow = {
  paymentMethod: string;
  amountDueIdr: number;
  amountPaidIdr: number;
  payments: PaymentTally[];
};

function refundedTotal(payments: PaymentTally[]): number {
  return payments.reduce((total, payment) => total + payment.refundedIdr, 0);
}

/** A `Payment` row as `lib/payments/types.ts` publishes it: plain JSON, no Dates. */
function toPaymentSummary(row: {
  id: string;
  channel: PaymentSummary["channel"];
  status: PaymentSummary["status"];
  amountIdr: number;
  amountPaidIdr: number;
  refundedIdr: number;
  refundedAt: Date | null;
  refundNote: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  lastError: string | null;
}): PaymentSummary {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    amountIdr: row.amountIdr,
    amountPaidIdr: row.amountPaidIdr,
    refundedIdr: row.refundedIdr,
    refundedAt: row.refundedAt?.toISOString() ?? null,
    refundNote: row.refundNote,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lastError: row.lastError,
  };
}

/**
 * Pure, so the list, the agenda and the detail page can never disagree.
 *
 * `Booking.amountPaidIdr` is the authority on what arrived — the callback
 * writes it — and the `Payment` rows are the authority on what was given back.
 * A refund is checked first because a fully refunded booking whose money did
 * once arrive would otherwise read as "paid", which is exactly the sentence
 * that gets a customer chased for money the studio already returned.
 */
export function paymentStateOf(row: PaidBookingRow): PaymentState {
  const paid = row.amountPaidIdr;
  const refunded = refundedTotal(row.payments);

  if (refunded > 0) return refunded >= paid ? "REFUNDED" : "PART_REFUNDED";
  if (paid === 0) {
    return row.paymentMethod === PaymentMethod.AT_STUDIO
      ? "AT_STUDIO"
      : "UNPAID";
  }
  if (row.amountDueIdr > 0 && paid < row.amountDueIdr) return "PART_PAID";

  return "PAID";
}

/** A booking as the admin tables list it: the session, plus where the money is. */
export type BookingListRow = BookingSummary & {
  payment: PaymentState;
  /** Net of anything refunded, so a returned deposit stops counting as takings. */
  paidIdr: number;
};

function toListRow(
  row: Parameters<typeof toBookingSummary>[0] & PaidBookingRow,
): BookingListRow {
  return {
    ...toBookingSummary(row),
    payment: paymentStateOf(row),
    paidIdr: Math.max(0, row.amountPaidIdr - refundedTotal(row.payments)),
  };
}

// ── Today's agenda ────────────────────────────────────────────────────────

export type Agenda = {
  date: IsoDate;
  tomorrow: IsoDate;
  bookings: BookingListRow[];
  todayCount: number;
  tomorrowCount: number;
  /** Today's confirmed and completed takings, at the price each was booked at. */
  todayValueIdr: number;
  /**
   * The same figure split in two, because they are two different piles of
   * money: one is already in the bank and one is cash somebody at the desk
   * still has to ask for. A single "takings" number hides which.
   */
  paidOnlineIdr: number;
  dueAtStudioIdr: number;
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
      /* One extra query for the whole day's charges, not one per row: Prisma
         resolves an included relation in a single statement. */
      include: { ...bookingInclude, payments: { select: paymentTallySelect } },
    }),
    prisma.booking.count({
      where: {
        startAt: { gte: studioDayStart(tomorrow), lt: studioDayEnd(tomorrow) },
        status: { in: LIVE_STATUSES },
      },
    }),
  ]);

  const bookings = rows.map(toListRow);
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
    paidOnlineIdr: live.reduce((total, booking) => total + booking.paidIdr, 0),
    /* Never negative: somebody who overpaid online does not reduce what the
       next customer owes at the desk. */
    dueAtStudioIdr: live.reduce(
      (total, booking) =>
        total + Math.max(0, booking.priceIdr - booking.paidIdr),
      0,
    ),
  };
}

// ── Bookings list ─────────────────────────────────────────────────────────

/**
 * The four payment filters, and why they are coarser than the column.
 *
 * The column can say "part paid" and "partly refunded" because it works those
 * out in JavaScript from rows already fetched. A filter has to be a `WHERE`,
 * and "paid in full" means comparing two columns of the same row — so these
 * four stick to what Postgres can answer without a raw query: which method,
 * whether anything arrived, whether anything was given back.
 */
export const PAYMENT_FILTERS = [
  "at_studio",
  "unpaid",
  "paid",
  "refunded",
] as const;

export type PaymentFilterValue = (typeof PAYMENT_FILTERS)[number];

export type BookingFilters = {
  from: IsoDate | null;
  to: IsoDate | null;
  therapistId: string | null;
  status: BookingStatusValue | null;
  payment: PaymentFilterValue | null;
  page: number;
};

export type BookingPage = {
  bookings: BookingListRow[];
  total: number;
  page: number;
  pageCount: number;
};

function paymentWhere(filter: PaymentFilterValue | null) {
  switch (filter) {
    case "at_studio":
      return { paymentMethod: PaymentMethod.AT_STUDIO, amountPaidIdr: 0 };
    case "unpaid":
      return { paymentMethod: PaymentMethod.ONLINE, amountPaidIdr: 0 };
    case "paid":
      /* Money arrived and none of it went back. The refund test is on the
         charge rather than the booking because a refund is recorded against
         the charge it reverses. */
      return {
        amountPaidIdr: { gt: 0 },
        payments: { none: { refundedIdr: { gt: 0 } } },
      };
    case "refunded":
      return { payments: { some: { refundedIdr: { gt: 0 } } } };
    default:
      return {};
  }
}

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
    ...paymentWhere(filters.payment),
  };

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: (page - 1) * BOOKINGS_PAGE_SIZE,
      take: BOOKINGS_PAGE_SIZE,
      /* The charges come back with the page, not a query per row: twenty-five
         round trips to print one column would be twenty-five too many. */
      include: { ...bookingInclude, payments: { select: paymentTallySelect } },
    }),
  ]);

  return {
    bookings: rows.map(toListRow),
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

/**
 * The money side of one booking, assembled for the payment panel.
 *
 * `priceIdr` and `dueOnlineIdr` are not the same number and must not be
 * conflated: the price is what the session costs, `dueOnlineIdr` is what the
 * online flow asked for — the whole price today, a deposit if the studio ever
 * takes one, and zero for a booking that is being paid at the desk.
 */
export type BookingPaymentDetail = {
  method: PaymentMethodValue;
  state: PaymentState;
  /** The session price as quoted at booking: what the customer owes in total. */
  priceIdr: number;
  dueOnlineIdr: number;
  /** What arrived, before refunds. */
  paidIdr: number;
  refundedIdr: number;
  /** `priceIdr − (paidIdr − refundedIdr)`. Positive means money still to collect. */
  balanceIdr: number;
  /** Newest first. Every attempt, including the ones that came to nothing. */
  payments: PaymentSummary[];
};

export type BookingDetail = {
  view: BookingView;
  therapistId: string;
  variantId: string;
  payment: BookingPaymentDetail;
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

  const [jobs, audit, payments] = await Promise.all([
    prisma.notificationJob.findMany({
      where: { bookingId: id },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.auditLog.findMany({
      where: { entity: "Booking", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payment.findMany({
      where: { bookingId: id },
      /* Newest first. The charge somebody is asking about is nearly always
         the last one — the expired QRIS above it is only there to explain
         why there are two. */
      orderBy: { createdAt: "desc" },
      select: paymentSelect,
    }),
  ]);

  const refunded = refundedTotal(payments);

  return {
    view: toBookingView(row),
    therapistId: row.therapistId,
    variantId: row.variantId,
    payment: {
      method: row.paymentMethod,
      state: paymentStateOf({ ...row, payments }),
      priceIdr: row.priceIdrAtBooking,
      dueOnlineIdr: row.amountDueIdr,
      paidIdr: row.amountPaidIdr,
      refundedIdr: refunded,
      balanceIdr: row.priceIdrAtBooking - (row.amountPaidIdr - refunded),
      payments: payments.map(toPaymentSummary),
    },
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
