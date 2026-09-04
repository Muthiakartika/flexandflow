/**
 * The intake form's own outbound queue — a structural mirror of
 * `lib/notifications/jobs.ts`'s claim/backoff/retry shape, kept as its own
 * module rather than an extension of `NotificationJob` (whose `bookingId` is
 * a required FK with cascade delete). Sends through the same SendGrid/WAHA
 * transports, re-exported for this purpose from `lib/notifications`.
 *
 * Same rule as booking's queue: `queueIntakeSubmissionCreated` only writes
 * rows. Nothing here opens a socket until `dispatchPendingIntake` runs, which
 * the API route calls from `after()` — a WAHA outage must never be able to
 * fail a client's submission.
 */
import "server-only";

import {
  IntakeNotificationKind,
  JobStatus,
  NotificationChannel,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail, sendWhatsAppText, type DeliveryResult } from "@/lib/notifications";
import { intakeSheetUrl } from "@/lib/intake/sheets";

/** Same published schedule as the booking queue: 1m, 5m, 15m, 1h, 6h. */
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
const MAX_ATTEMPTS = 5;
const CLAIM_LEASE_MS = 5 * 60_000;
const MAX_ERROR_LENGTH = 400;
const DEFAULT_DISPATCH_LIMIT = 25;

type SubmissionSummary = {
  reference: string;
  clientName: string;
  clientWhatsapp: string;
};

/**
 * The message itself.
 *
 * The closing line points at the Google Sheet, because that is where the
 * studio actually reads submissions — the admin panel is only named when no
 * sheet is configured, so the notice never sends someone to a link that
 * cannot exist (`intakeSheetUrl` returns null in exactly that case).
 *
 * The row may land in the sheet a moment after this message does:
 * `app/api/intake/route.ts` dispatches notifications before it syncs, so a
 * WhatsApp read the instant it arrives can beat the append by a second or
 * two. That order is deliberate — a slow or broken Sheets call must never
 * delay telling the studio somebody walked in.
 */
function adminNewSubmissionMessage(submission: SubmissionSummary): string {
  const sheet = intakeSheetUrl();

  const lines = [
    `*New intake form submitted* — ${submission.reference}`,
    ``,
    `Client: ${submission.clientName}`,
  ];

  if (submission.clientWhatsapp) {
    lines.push(`WhatsApp: ${submission.clientWhatsapp}`);
  }

  lines.push(``);
  lines.push(
    sheet
      ? `See the full form in this sheet: ${sheet}`
      : `See the full form and signature in the admin panel.`,
  );

  return lines.join("\n");
}

// ── Writing jobs ──────────────────────────────────────────────────────────

/**
 * Who hears about a new intake form.
 *
 * `ADMIN_WHATSAPP_NUMBERS` is shared with the booking system — everyone on it
 * already receives every appointment. `INTAKE_WHATSAPP_NUMBERS` is this form's
 * own list, for somebody who should see a consent form arrive without also
 * being sent the diary.
 *
 * Deduplicated because a number on both lists is one person: `createMany`'s
 * `skipDuplicates` and the unique index on
 * `(submissionId, channel, kind, target)` would catch it, but a duplicate
 * target is better not written than caught.
 */
function adminWhatsAppTargets(): string[] {
  const config = env();
  return [
    ...new Set([...config.ADMIN_WHATSAPP_NUMBERS, ...config.INTAKE_WHATSAPP_NUMBERS]),
  ];
}

export async function queueIntakeSubmissionCreated(submissionId: string): Promise<void> {
  const targets = adminWhatsAppTargets();
  if (targets.length === 0) return;

  await prisma.intakeNotificationJob.createMany({
    data: targets.map((target) => ({
      submissionId,
      channel: NotificationChannel.WHATSAPP,
      kind: IntakeNotificationKind.ADMIN_NEW_SUBMISSION,
      target,
    })),
    skipDuplicates: true,
  });
}

// ── Dispatch ──────────────────────────────────────────────────────────────

type ClaimedJob = {
  id: string;
  submissionId: string;
  channel: NotificationChannel;
  kind: IntakeNotificationKind;
  target: string;
  attempts: number;
};

async function claim(id: string, now: Date): Promise<ClaimedJob | null> {
  const claimed = await prisma.intakeNotificationJob.updateMany({
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

  return prisma.intakeNotificationJob.findUnique({
    where: { id },
    select: {
      id: true,
      submissionId: true,
      channel: true,
      kind: true,
      target: true,
      attempts: true,
    },
  });
}

async function deliver(
  job: ClaimedJob,
  submission: SubmissionSummary,
): Promise<DeliveryResult> {
  if (job.kind !== IntakeNotificationKind.ADMIN_NEW_SUBMISSION) {
    return {
      ok: false,
      permanent: true,
      error: `No message is defined for ${job.kind}.`,
    };
  }

  const text = adminNewSubmissionMessage(submission);

  if (job.channel === NotificationChannel.WHATSAPP) {
    return sendWhatsAppText(job.target, text);
  }

  return sendEmail({
    to: job.target,
    subject: `New intake form — ${submission.reference}`,
    text,
    html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
  });
}

async function recordSuccess(id: string): Promise<void> {
  await prisma.intakeNotificationJob.update({
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
    await prisma.intakeNotificationJob.update({
      where: { id: job.id },
      data: { status: JobStatus.DEAD, lastError: error },
    });
    return "dead";
  }

  const delay = BACKOFF_MS[Math.min(job.attempts, BACKOFF_MS.length) - 1];

  await prisma.intakeNotificationJob.update({
    where: { id: job.id },
    data: {
      status: JobStatus.FAILED,
      lastError: error,
      scheduledAt: new Date(Date.now() + delay),
    },
  });

  return "failed";
}

export async function dispatchPendingIntake(
  limit: number = DEFAULT_DISPATCH_LIMIT,
): Promise<{ attempted: number; sent: number; failed: number; dead: number }> {
  const now = new Date();

  const candidates = await prisma.intakeNotificationJob.findMany({
    where: {
      status: { in: [JobStatus.PENDING, JobStatus.FAILED] },
      scheduledAt: { lte: now },
    },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const submissions = new Map<string, SubmissionSummary | null>();

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of candidates) {
    const job = await claim(candidate.id, now);
    if (!job) continue;

    attempted += 1;

    if (!submissions.has(job.submissionId)) {
      const row = await prisma.intakeSubmission.findUnique({
        where: { id: job.submissionId },
        select: { reference: true, clientName: true, clientWhatsapp: true },
      });
      submissions.set(job.submissionId, row);
    }
    const submission = submissions.get(job.submissionId) ?? null;

    let result: DeliveryResult;

    if (!submission) {
      result = { ok: false, permanent: true, error: "The submission no longer exists." };
    } else {
      try {
        result = await deliver(job, submission);
      } catch (error) {
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
