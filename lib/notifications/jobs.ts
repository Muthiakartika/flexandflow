/**
 * The outbound queue: what gets written, what gets claimed, what gets retried.
 *
 * The whole shape of this file follows from one rule in BOOKING-PLAN.md §6.1 —
 * the booking commits first and notifications follow. So queueing writes rows
 * and nothing else. It never opens a socket to SendGrid or WAHA, because a
 * WAHA session that has quietly logged out is the single most likely failure
 * in this system and it must never be able to fail a customer's booking.
 *
 * Sending happens later and somewhere else: `after()` runs `dispatchPending`
 * once the customer already has their response, and the cron schedule runs it again
 * every ten minutes for whatever did not go through the first time.
 *
 * Idempotence is the database's job. `@@unique([bookingId, channel, kind,
 * target])` means the same message can never be queued twice however many
 * times a route handler is retried, so nothing here checks first — it writes
 * with `skipDuplicates` and lets the constraint decide.
 */
import "server-only";

import {
  JobStatus,
  NotificationChannel,
  NotificationKind,
} from "@/generated/prisma/enums";

import {
  addStudioDays,
  studioDateKey,
  studioDayEnd,
  studioDayStart,
  studioInstant,
} from "@/lib/booking/time";
import {
  loadBookingById,
  settledPayment,
  toBookingSummary,
  toBookingView,
} from "@/lib/booking/view";
import type { BookingView } from "@/lib/booking/types";
import type { LoadedBooking } from "@/lib/booking/view";
import { bookingIcs, icsFilename, type IcsMethod } from "@/lib/calendar/ics";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail, type EmailAttachment } from "@/lib/notifications/email";
import * as messages from "@/lib/notifications/messages";
import * as templates from "@/lib/notifications/templates/booking";
import type { EmailContent } from "@/lib/notifications/templates/layout";
import { sendWhatsAppText, wahaSessionStatus } from "@/lib/notifications/whatsapp";

/**
 * What a transport reports back.
 *
 * `permanent` belongs to the queue rather than to SendGrid or WAHA, which is
 * why the type lives here: it is not "what went wrong" but "is trying again
 * worth anything". `email.ts` and `whatsapp.ts` import it as a type only, so
 * there is no runtime cycle.
 */
export type DeliveryResult =
  | { ok: true; detail?: string }
  | { ok: false; error: string; permanent: boolean };

/**
 * The published retry schedule: 1m, 5m, 15m, 1h, 6h.
 *
 * `MAX_ATTEMPTS` is five, so the fifth failure is the last and the 6h step is
 * the tail of the schedule rather than a delay that runs — kept whole so
 * raising the budget is a one-line change and not a redesign.
 */
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
const MAX_ATTEMPTS = 5;

/** Long enough for a 20s send plus a slow database; short enough to recover. */
const CLAIM_LEASE_MS = 5 * 60_000;

/** `lastError` is a diagnostic, not a transcript. A stack trace is not useful here. */
const MAX_ERROR_LENGTH = 400;

/** H-1 at 10:00 studio time, the hour BOOKING-PLAN.md §8 settled on. */
const REMINDER_MINUTE_OF_DAY = 10 * 60;

const DEFAULT_DISPATCH_LIMIT = 25;

type JobSeed = {
  channel: NotificationChannel;
  kind: NotificationKind;
  target: string;
  scheduledAt?: Date;
};

// ── Targets ───────────────────────────────────────────────────────────────

function dedupe(values: string[], key: (value: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const id = key(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(value);
  }

  return out;
}

/**
 * The studio's inboxes plus the therapist who has to be there.
 *
 * The therapist is often already in `ADMIN_NOTIFY_EMAILS` at a one-therapist
 * studio, hence the dedupe — two identical emails read as a bug in the system
 * rather than as thoroughness.
 */
function adminEmailTargets(booking: LoadedBooking): string[] {
  const therapist = booking.therapist.email;
  const all = [...env().ADMIN_NOTIFY_EMAILS, ...(therapist ? [therapist] : [])];
  return dedupe(all, (value) => value.trim().toLowerCase());
}

function adminWhatsAppTargets(booking: LoadedBooking): string[] {
  const therapist = booking.therapist.phoneE164;
  const all = [...env().ADMIN_WHATSAPP_NUMBERS, ...(therapist ? [therapist] : [])];
  return dedupe(all, (value) => value.replace(/\D/g, ""));
}

function customerSeeds(
  booking: LoadedBooking,
  kind: NotificationKind,
  scheduledAt?: Date,
): JobSeed[] {
  const seeds: JobSeed[] = [
    {
      channel: NotificationChannel.WHATSAPP,
      kind,
      target: booking.customer.phoneE164,
      scheduledAt,
    },
  ];

  /* Email is optional in the wizard; WhatsApp is not. */
  if (booking.customer.email) {
    seeds.unshift({
      channel: NotificationChannel.EMAIL,
      kind,
      target: booking.customer.email,
      scheduledAt,
    });
  }

  return seeds;
}

function adminSeeds(booking: LoadedBooking, kind: NotificationKind): JobSeed[] {
  return [
    ...adminEmailTargets(booking).map((target) => ({
      channel: NotificationChannel.EMAIL,
      kind,
      target,
    })),
    ...adminWhatsAppTargets(booking).map((target) => ({
      channel: NotificationChannel.WHATSAPP,
      kind,
      target,
    })),
  ];
}

// ── Writing jobs ──────────────────────────────────────────────────────────

async function createJobs(
  bookingId: string,
  seeds: JobSeed[],
  now: Date,
): Promise<number> {
  if (seeds.length === 0) return 0;

  const created = await prisma.notificationJob.createMany({
    data: seeds.map((seed) => ({
      bookingId,
      channel: seed.channel,
      kind: seed.kind,
      target: seed.target,
      scheduledAt: seed.scheduledAt ?? now,
    })),
    skipDuplicates: true,
  });

  return created.count;
}

/** 10:00 studio time on the day before the session, as a UTC instant. */
function reminderMoment(startAt: Date): Date {
  const dayBefore = addStudioDays(studioDateKey(startAt), -1);
  return studioInstant(dayBefore, REMINDER_MINUTE_OF_DAY);
}

export async function queueBookingCreated(bookingId: string): Promise<void> {
  const booking = await loadBookingById(bookingId);
  if (!booking) return;

  const now = new Date();
  const seeds: JobSeed[] = [
    ...customerSeeds(booking, NotificationKind.CUSTOMER_CONFIRMATION),
    ...adminSeeds(booking, NotificationKind.ADMIN_NEW_BOOKING),
  ];

  /*
   * The receipt, and it is seeded here rather than by the two settlement paths
   * because there are two of them — the gateway callback and the card route —
   * and a rule that has to be repeated in both is a rule that will eventually
   * hold in one. This function is what each of them calls, and on the pay-now
   * path it runs exactly once: at settlement, not at booking.
   *
   * Conditioned on the money rather than on the payment method, so a booking
   * that somehow reaches here unpaid gets a confirmation and no receipt, which
   * is the right way round to be wrong.
   *
   * The studio is not sent one. It already gets `ADMIN_NEW_BOOKING` in the same
   * second on this path, and a second message saying the same thing arrives as
   * noise rather than as information.
   */
  if (settledPayment(booking)) {
    seeds.push(
      ...customerSeeds(booking, NotificationKind.CUSTOMER_PAYMENT_RECEIVED),
    );
  }

  /*
   * The reminder is queued now with a date in the future rather than found by
   * a nightly scan — the row exists from the moment the booking does, so a
   * cron that misses a night costs nothing. Booked less than a day ahead and
   * the moment has already passed: there is no reminder to give.
   */
  const remindAt = reminderMoment(booking.startAt);
  if (remindAt.getTime() > now.getTime()) {
    seeds.push(
      ...customerSeeds(booking, NotificationKind.CUSTOMER_REMINDER, remindAt),
    );
  }

  await createJobs(bookingId, seeds, now);
}

export async function queueBookingCancelled(bookingId: string): Promise<void> {
  const booking = await loadBookingById(bookingId);
  if (!booking) return;

  const now = new Date();

  await createJobs(
    bookingId,
    [
      ...customerSeeds(booking, NotificationKind.CUSTOMER_CANCELLED),
      ...adminSeeds(booking, NotificationKind.ADMIN_CANCELLED),
    ],
    now,
  );

  /* A reminder for a session that is not happening is worse than no reminder,
     so any still waiting is retired rather than left to fire tomorrow. */
  await prisma.notificationJob.updateMany({
    where: {
      bookingId,
      kind: NotificationKind.CUSTOMER_REMINDER,
      status: { in: [JobStatus.PENDING, JobStatus.FAILED] },
    },
    data: {
      status: JobStatus.DEAD,
      lastError: "Booking cancelled before the reminder was due.",
    },
  });
}

export async function queueBookingRescheduled(bookingId: string): Promise<void> {
  const booking = await loadBookingById(bookingId);
  if (!booking) return;

  const now = new Date();
  const remindAt = reminderMoment(booking.startAt);
  const stillAhead = remindAt.getTime() > now.getTime();

  const seeds: JobSeed[] = [
    ...customerSeeds(booking, NotificationKind.CUSTOMER_RESCHEDULED),
    ...adminSeeds(booking, NotificationKind.ADMIN_RESCHEDULED),
  ];
  if (stillAhead) {
    seeds.push(
      ...customerSeeds(booking, NotificationKind.CUSTOMER_REMINDER, remindAt),
    );
  }

  await createJobs(bookingId, seeds, now);

  /*
   * The reminder row usually already exists from the original booking, so
   * `skipDuplicates` leaves it pointing at the old date — the one case where
   * the unique constraint works against us. Moving it is an explicit update,
   * and it resets the attempt count because a new date deserves a fresh
   * retry budget rather than whatever the old one had left.
   */
  await prisma.notificationJob.updateMany({
    where: {
      bookingId,
      kind: NotificationKind.CUSTOMER_REMINDER,
      status: { not: JobStatus.SENT },
    },
    data: stillAhead
      ? {
          status: JobStatus.PENDING,
          scheduledAt: remindAt,
          attempts: 0,
          lastError: null,
        }
      : {
          status: JobStatus.DEAD,
          lastError: "Rescheduled to within a day; no reminder to send.",
        },
  });
}

/**
 * The nightly backstop for reminders.
 *
 * Every booking already queues its own reminder at creation, so on a healthy
 * day this queues nothing. It exists for the rows that were never written —
 * a booking made after 10:00 the day before, a queue write that lost its
 * transaction. Idempotent because it writes the same unique rows.
 */
export async function queueDueReminders(
  now: Date = new Date(),
): Promise<{ queued: number }> {
  const tomorrow = addStudioDays(studioDateKey(now), 1);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startAt: { gte: studioDayStart(tomorrow), lt: studioDayEnd(tomorrow) },
    },
    select: {
      id: true,
      customer: { select: { email: true, phoneE164: true } },
    },
  });

  let queued = 0;

  for (const booking of bookings) {
    const seeds: JobSeed[] = [
      {
        channel: NotificationChannel.WHATSAPP,
        kind: NotificationKind.CUSTOMER_REMINDER,
        target: booking.customer.phoneE164,
        scheduledAt: now,
      },
    ];

    if (booking.customer.email) {
      seeds.unshift({
        channel: NotificationChannel.EMAIL,
        kind: NotificationKind.CUSTOMER_REMINDER,
        target: booking.customer.email,
        scheduledAt: now,
      });
    }

    queued += await createJobs(booking.id, seeds, now);
  }

  return { queued };
}

// ── Rendering ─────────────────────────────────────────────────────────────

function emailFor(kind: NotificationKind, view: BookingView): EmailContent | null {
  switch (kind) {
    case NotificationKind.CUSTOMER_CONFIRMATION:
      return templates.customerConfirmationEmail(view);
    case NotificationKind.CUSTOMER_PAYMENT_RECEIVED:
      return templates.customerPaymentReceivedEmail(view);
    case NotificationKind.CUSTOMER_REMINDER:
      return templates.customerReminderEmail(view);
    case NotificationKind.CUSTOMER_CANCELLED:
      return templates.customerCancelledEmail(view);
    case NotificationKind.CUSTOMER_RESCHEDULED:
      return templates.customerRescheduledEmail(view);
    case NotificationKind.ADMIN_NEW_BOOKING:
      return templates.adminNewBookingEmail(view);
    case NotificationKind.ADMIN_CANCELLED:
      return templates.adminCancelledEmail(view);
    case NotificationKind.ADMIN_RESCHEDULED:
      return templates.adminRescheduledEmail(view);
    default:
      return null;
  }
}

function whatsAppTextFor(kind: NotificationKind, view: BookingView): string | null {
  switch (kind) {
    case NotificationKind.CUSTOMER_CONFIRMATION:
      return messages.customerConfirmationMessage(view);
    case NotificationKind.CUSTOMER_PAYMENT_RECEIVED:
      return messages.customerPaymentReceivedMessage(view);
    case NotificationKind.CUSTOMER_REMINDER:
      return messages.customerReminderMessage(view);
    case NotificationKind.CUSTOMER_CANCELLED:
      return messages.customerCancelledMessage(view);
    case NotificationKind.CUSTOMER_RESCHEDULED:
      return messages.customerRescheduledMessage(view);
    case NotificationKind.ADMIN_NEW_BOOKING:
      return messages.adminNewBookingMessage(view);
    case NotificationKind.ADMIN_CANCELLED:
      return messages.adminCancelledMessage(view);
    case NotificationKind.ADMIN_RESCHEDULED:
      return messages.adminRescheduledMessage(view);
    default:
      return null;
  }
}

/**
 * The calendar file, on the three emails that change what is in a calendar.
 *
 * The reminder gets none: the event is already there, and a second attachment
 * with the same UID buys nothing. `CANCEL` plus the same UID removes the event
 * rather than adding a "cancelled" one beside it, and the bumped `SEQUENCE` is
 * what makes a reschedule update in place instead of duplicating.
 */
function icsAttachments(
  kind: NotificationKind,
  booking: LoadedBooking,
  manageUrl: string,
): EmailAttachment[] {
  const method: IcsMethod | null =
    kind === NotificationKind.CUSTOMER_CONFIRMATION ||
    kind === NotificationKind.CUSTOMER_RESCHEDULED
      ? "PUBLISH"
      : kind === NotificationKind.CUSTOMER_CANCELLED
        ? "CANCEL"
        : null;

  if (!method) return [];

  const summary = toBookingSummary(booking);

  return [
    {
      filename: icsFilename(summary),
      content: bookingIcs(summary, {
        method,
        sequence: booking.icsSequence,
        manageUrl,
      }),
      type: `text/calendar; method=${method}`,
    },
  ];
}

// ── Dispatch ──────────────────────────────────────────────────────────────

type ClaimedJob = {
  id: string;
  bookingId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  target: string;
  attempts: number;
};

/**
 * Take a job, or find that somebody else already has it.
 *
 * Two cron invocations overlapping is normal — a slow run and the next one on
 * schedule — and both would otherwise select the same rows and send the same
 * WhatsApp twice. The claim is a conditional `updateMany` that pushes
 * `scheduledAt` past the lease: Postgres re-evaluates the WHERE against the
 * row version the first writer committed, so the loser matches nothing and
 * gets `count: 0`. That is the interlock; the `findMany` above it is only a
 * way to pick candidates cheaply.
 *
 * `attempts` increments here rather than on failure, so a job that reliably
 * crashes the function still exhausts its budget and dies instead of being
 * retried forever.
 */
async function claim(id: string, now: Date): Promise<ClaimedJob | null> {
  const claimed = await prisma.notificationJob.updateMany({
    where: {
      id,
      status: { in: [JobStatus.PENDING, JobStatus.FAILED] },
      scheduledAt: { lte: now },
    },
    data: {
      scheduledAt: new Date(now.getTime() + CLAIM_LEASE_MS),
      attempts: { increment: 1 },
    },
  });

  if (claimed.count === 0) return null;

  const job = await prisma.notificationJob.findUnique({
    where: { id },
    select: {
      id: true,
      bookingId: true,
      channel: true,
      kind: true,
      target: true,
      attempts: true,
    },
  });

  return job ?? null;
}

async function deliver(
  job: ClaimedJob,
  booking: LoadedBooking,
): Promise<DeliveryResult> {
  const view = toBookingView(booking);

  if (job.channel === NotificationChannel.WHATSAPP) {
    const text = whatsAppTextFor(job.kind, view);
    if (!text) {
      return {
        ok: false,
        permanent: true,
        error: `No WhatsApp message is defined for ${job.kind}.`,
      };
    }
    return sendWhatsAppText(job.target, text);
  }

  const content = emailFor(job.kind, view);
  if (!content) {
    return {
      ok: false,
      permanent: true,
      error: `No email template is defined for ${job.kind}.`,
    };
  }

  return sendEmail({
    to: job.target,
    subject: content.subject,
    html: content.html,
    text: content.text,
    attachments: icsAttachments(job.kind, booking, view.manageUrl),
  });
}

async function recordSuccess(id: string): Promise<void> {
  await prisma.notificationJob.update({
    where: { id },
    data: { status: JobStatus.SENT, sentAt: new Date(), lastError: null },
  });
}

async function recordFailure(
  job: ClaimedJob,
  result: Extract<DeliveryResult, { ok: false }>,
): Promise<"failed" | "dead"> {
  const error = result.error.slice(0, MAX_ERROR_LENGTH);
  const givingUp = result.permanent || job.attempts >= MAX_ATTEMPTS;

  if (givingUp) {
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: { status: JobStatus.DEAD, lastError: error },
    });
    return "dead";
  }

  const delay = BACKOFF_MS[Math.min(job.attempts, BACKOFF_MS.length) - 1];

  await prisma.notificationJob.update({
    where: { id: job.id },
    data: {
      status: JobStatus.FAILED,
      lastError: error,
      scheduledAt: new Date(Date.now() + delay),
    },
  });

  return "failed";
}

export async function dispatchPending(
  limit: number = DEFAULT_DISPATCH_LIMIT,
): Promise<{ attempted: number; sent: number; failed: number; dead: number }> {
  const now = new Date();

  const candidates = await prisma.notificationJob.findMany({
    where: {
      status: { in: [JobStatus.PENDING, JobStatus.FAILED] },
      scheduledAt: { lte: now },
    },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  /* One booking usually owns several jobs in the same batch — customer email,
     customer WhatsApp, two admin messages. They read the same row. */
  const bookings = new Map<string, LoadedBooking | null>();

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of candidates) {
    const job = await claim(candidate.id, now);
    if (!job) continue;

    attempted += 1;

    if (!bookings.has(job.bookingId)) {
      bookings.set(job.bookingId, await loadBookingById(job.bookingId));
    }
    const booking = bookings.get(job.bookingId) ?? null;

    let result: DeliveryResult;

    if (!booking) {
      /* Deleted between queueing and dispatch. Nothing to send, ever. */
      result = {
        ok: false,
        permanent: true,
        error: "The booking no longer exists.",
      };
    } else if (
      job.kind === NotificationKind.CUSTOMER_REMINDER &&
      booking.status !== "CONFIRMED"
    ) {
      result = {
        ok: false,
        permanent: true,
        error: `Booking is ${booking.status}; no reminder is due.`,
      };
    } else {
      try {
        result = await deliver(job, booking);
      } catch (error) {
        /* A transport is not supposed to throw. If one does, the queue still
           has to record something rather than lose the job to the lease. */
        result = {
          ok: false,
          permanent: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    if (result.ok) {
      await recordSuccess(job.id);
      sent += 1;
      continue;
    }

    const outcome = await recordFailure(job, result);
    if (outcome === "dead") dead += 1;
    else failed += 1;
  }

  return { attempted, sent, failed, dead };
}

// ── Diagnostics ───────────────────────────────────────────────────────────

export async function wahaHealth(): Promise<{
  ok: boolean;
  status: string;
  detail?: string;
}> {
  try {
    return await wahaSessionStatus();
  } catch (error) {
    /* `wahaSessionStatus` already swallows its own failures; this catches the
       one it cannot — `env()` throwing because WAHA was never configured. */
    return {
      ok: false,
      status: "UNCONFIGURED",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendTestMessages(to: {
  email?: string;
  phoneE164?: string;
}): Promise<{ email?: string; whatsapp?: string }> {
  const result: { email?: string; whatsapp?: string } = {};

  if (to.email) {
    try {
      const content = templates.testEmail();
      const sent = await sendEmail({
        to: to.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      result.email = sent.ok ? "Sent." : `Failed — ${sent.error}`;
    } catch (error) {
      result.email = `Failed — ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  if (to.phoneE164) {
    try {
      const sent = await sendWhatsAppText(to.phoneE164, messages.testMessage());
      result.whatsapp = sent.ok ? "Sent." : `Failed — ${sent.error}`;
    } catch (error) {
      result.whatsapp = `Failed — ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return result;
}
