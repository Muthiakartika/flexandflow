/**
 * The one way a booking is read out of the database.
 *
 * A booking is rendered by the confirmation page, the manage page, two email
 * templates, two WhatsApp messages, the `.ics` file and the admin list. If each
 * of those assembled its own object, they would disagree — about whether the
 * duration shown includes the clean-down buffer, about which name to print for
 * the therapist, about the timezone. They all read through here instead.
 *
 * The important distinction this file keeps straight: `Booking.endAt` in the
 * database includes the buffer, because that is what the no-overlap constraint
 * has to protect. The customer's session ends earlier. `BookingSummary.endAt`
 * is the **customer-facing** end — start plus duration, buffer excluded — so
 * nobody is ever told their massage runs fifteen minutes longer than it does.
 */
import "server-only";

import { addMinutes } from "date-fns";

import { googleCalendarUrl } from "@/lib/calendar/links";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  formatStudioDate,
  formatStudioTime,
} from "@/lib/booking/time";
import { createManageToken, readManageToken } from "@/lib/booking/tokens";
import type {
  BookingStatusValue,
  BookingSummary,
  BookingView,
  PaidPayment,
  Tier,
} from "@/lib/booking/types";

/** Everything `toBookingSummary` reads. Use it on every booking query. */
export const bookingInclude = {
  customer: true,
  therapist: true,
  variant: { include: { service: true } },
  /*
   * The settled payment, and only that one. A booking can accumulate several
   * `Payment` rows — a QR code that lapsed, a bank transfer opened instead —
   * but at most one of them is ever `PAID`, so this is a single row rather
   * than a history. `take: 1` keeps it that way even if that ever stops being
   * true, and the whole join is skipped on the pay-at-the-studio path because
   * there is nothing to match.
   */
  payments: {
    where: { status: "PAID" as const },
    orderBy: { paidAt: "desc" as const },
    take: 1,
    select: {
      channel: true,
      amountPaidIdr: true,
      paidAt: true,
      providerId: true,
    },
  },
} as const;

type BookingRow = {
  id: string;
  reference: string;
  status: string;
  /* The two foreign keys, kept because a reschedule needs them: the wizard
     asks the slots endpoint for the same variant and the same therapist, and
     neither is recoverable from the names and slugs below. */
  therapistId: string;
  variantId: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  bufferMinutes: number;
  priceIdrAtBooking: number;
  note: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  manageToken: string;
  icsSequence: number;
  customer: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    phoneE164: string;
  };
  therapist: {
    name: string;
    displayName: string;
    slug: string;
    tier: string;
    email: string | null;
    phoneE164: string | null;
  };
  variant: {
    tier: string;
    priceIdr: number;
    durationMinutes: number;
    service: {
      title: string;
      slug: string;
      image: string | null;
    };
  };
  payments: {
    channel: string;
    amountPaidIdr: number;
    paidAt: Date | null;
    providerId: string | null;
  }[];
};

/** The customer-facing end of the session: buffer excluded. */
export function sessionEnd(row: {
  startAt: Date;
  durationMinutes: number;
}): Date {
  return addMinutes(row.startAt, row.durationMinutes);
}

export function toBookingSummary(row: BookingRow): BookingSummary {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status as BookingStatusValue,

    startAt: row.startAt.toISOString(),
    endAt: sessionEnd(row).toISOString(),
    durationMinutes: row.durationMinutes,

    serviceTitle: row.variant.service.title,
    serviceSlug: row.variant.service.slug,
    serviceImage: row.variant.service.image,
    priceIdr: row.priceIdrAtBooking,

    therapistName: row.therapist.name,
    therapistDisplayName: row.therapist.displayName,
    therapistSlug: row.therapist.slug,
    tier: row.therapist.tier as Tier,

    customer: {
      firstName: row.customer.firstName,
      lastName: row.customer.lastName,
      email: row.customer.email,
      phoneE164: row.customer.phoneE164,
      note: row.note,
    },

    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,

    receipt: settledPayment(row),
  };
}

/*
 * `paidAt` is what marks a payment settled, and it is searched for rather than
 * assumed to be first. `bookingInclude` narrows the join to the settled row,
 * but the admin queries override `payments` to tally refunds across all of
 * them — so position means nothing there, and a `find` is right in both.
 *
 * A refund does not erase this. The receipt describes money that arrived at a
 * time, which stays true afterwards; what was given back is the admin panel's
 * `paidIdr` and `paymentState`, not this.
 */
export function settledPayment(row: BookingRow): PaidPayment | null {
  const paid = row.payments.find((entry) => entry.paidAt !== null);
  if (!paid?.paidAt) return null;

  return {
    channel: paid.channel as PaidPayment["channel"],
    amountPaidIdr: paid.amountPaidIdr,
    paidAt: paid.paidAt.toISOString(),
    providerId: paid.providerId,
  };
}

export function manageUrlFor(token: string): string {
  return `${env().NEXT_PUBLIC_SITE_URL}/appointment/manage/${token}/`;
}

export function icsUrlFor(token: string): string {
  return `${env().NEXT_PUBLIC_SITE_URL}/api/booking/${token}/calendar.ics`;
}

/**
 * Whether the customer may still act on this themselves.
 *
 * Inside the cutoff the answer is no, and the page says to message the studio
 * on WhatsApp instead — a session starting in an hour is one the therapist has
 * already travelled for, and quietly cancelling it costs somebody their morning.
 */
function withinCutoff(startAt: Date, now: Date): boolean {
  const hours = env().BOOKING_CANCEL_CUTOFF_HOURS;
  return startAt.getTime() - now.getTime() > hours * 60 * 60 * 1000;
}

export function toBookingView(
  row: BookingRow,
  now: Date = new Date(),
): BookingView {
  const summary = toBookingSummary(row);
  const manageUrl = manageUrlFor(row.manageToken);
  const open = row.status === "CONFIRMED" || row.status === "PENDING";
  const inTime = withinCutoff(row.startAt, now);

  return {
    ...summary,
    manageUrl,
    icsUrl: icsUrlFor(row.manageToken),
    googleCalendarUrl: googleCalendarUrl(summary, manageUrl),
    dateLabel: formatStudioDate(row.startAt),
    timeLabel: `${formatStudioTime(row.startAt)} – ${formatStudioTime(sessionEnd(row))}`,
    canCancel: open && inTime,
    canReschedule: open && inTime,
  };
}

/**
 * `BookingView` plus the two catalogue ids behind it.
 *
 * `BookingView` is what a customer-facing surface renders, and none of them —
 * confirmation, manage, email, `.ics` — has any use for a variant id. The
 * reschedule wizard does: it seeds itself from `GET /api/booking/[token]` and
 * then has to ask the slots endpoint which times are open *for that variant,
 * with that therapist*. Reconstructing the variant from `serviceSlug` would be
 * a guess — a service has one variant per tier and per duration — so the
 * endpoint states it instead.
 *
 * Only that endpoint returns this shape, which is why it is a second function
 * rather than two more fields on every booking payload the site sends.
 * `components/booking/useBookingApi.ts` mirrors the type for the client, this
 * module being `server-only`.
 */
export type BookingViewWithIds = BookingView & {
  therapistId: string;
  variantId: string;
};

export function toBookingViewWithIds(
  row: BookingRow,
  now: Date = new Date(),
): BookingViewWithIds {
  return {
    ...toBookingView(row, now),
    therapistId: row.therapistId,
    variantId: row.variantId,
  };
}

// ── Loaders ───────────────────────────────────────────────────────────────

/* The ids are on `BookingRow` itself now; the alias stays because half the
   booking code names this type. */
export type LoadedBooking = BookingRow;

export async function loadBookingById(
  id: string,
): Promise<LoadedBooking | null> {
  const row = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  return (row as LoadedBooking | null) ?? null;
}

/**
 * Resolves the HMAC token from a manage or `.ics` URL.
 *
 * The signature is checked before the database is touched, so a forged token
 * costs an HMAC and not a query.
 */
export async function loadBookingByToken(
  token: string,
): Promise<LoadedBooking | null> {
  const id = readManageToken(token);
  if (!id) return null;
  return loadBookingById(id);
}

export async function loadBookingByReference(
  reference: string,
): Promise<LoadedBooking | null> {
  const row = await prisma.booking.findUnique({
    where: { reference },
    include: bookingInclude,
  });
  return (row as LoadedBooking | null) ?? null;
}

export { createManageToken };
