/**
 * SendGrid, wrapped thinly.
 *
 * This module knows how to put one message on the wire and how to tell a
 * failure worth retrying from one that is not. It does not know what a booking
 * is, when to send, or what to do when sending fails — that is `jobs.ts`.
 *
 * Nothing here throws. A transport that throws forces every caller to decide
 * what an exception means, and the queue needs a decision it can store.
 */
import "server-only";

import sgMail from "@sendgrid/mail";

import { env } from "@/lib/env";
import type { DeliveryResult } from "@/lib/notifications/jobs";

/** Content is the raw file; base64 happens here so callers never think about it. */
export type EmailAttachment = {
  filename: string;
  content: string;
  /** Full MIME type, e.g. `text/calendar; method=PUBLISH`. */
  type: string;
};

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

/**
 * Configured on first send, not at module load.
 *
 * `next build` imports this file without a runtime environment; reading the
 * API key at import time would fail the build rather than the send.
 */
let configured = false;

function mailer(): typeof sgMail {
  if (!configured) {
    sgMail.setApiKey(env().SENDGRID_API_KEY);
    /* A hung SendGrid must not hold a serverless function open until the
       platform kills it and the queue never learns what happened. */
    sgMail.setTimeout(20_000);
    configured = true;
  }
  return sgMail;
}

/**
 * A SendGrid rejection, in the two parts the retry policy cares about.
 *
 * `code` on a SendGrid `ResponseError` is the HTTP status, not an error class.
 */
function describe(error: unknown): { message: string; status: number | null } {
  if (typeof error !== "object" || error === null) {
    return { message: String(error), status: null };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    response?: { body?: unknown };
  };

  const status = typeof candidate.code === "number" ? candidate.code : null;
  const body = candidate.response?.body;
  const detail =
    typeof body === "string"
      ? body
      : body === undefined || body === null
        ? ""
        : JSON.stringify(body);

  const message = [
    typeof candidate.message === "string" ? candidate.message : "",
    detail,
  ]
    .filter(Boolean)
    .join(" — ");

  return { message: message || "SendGrid rejected the message.", status };
}

export async function sendEmail(message: OutgoingEmail): Promise<DeliveryResult> {
  const config = env();

  try {
    await mailer().send({
      to: message.to,
      /*
       * The from-address has to be on a domain authenticated in SendGrid.
       * The studio's own address is `…@gmail.com`, and Gmail publishes a
       * strict DMARC policy: mail sent as a gmail.com address through a
       * third party fails alignment and is rejected or filed as spam. So the
       * envelope says `booking@flexandflow.fit` and the studio's Gmail goes
       * in Reply-To, which DMARC does not check — a reply still lands in the
       * inbox the owner actually reads. See BOOKING-PLAN.md §6.2.
       */
      from: {
        email: config.SENDGRID_FROM_EMAIL,
        name: config.SENDGRID_FROM_NAME,
      },
      ...(config.SENDGRID_REPLY_TO ? { replyTo: config.SENDGRID_REPLY_TO } : {}),
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((attachment) => ({
              content: Buffer.from(attachment.content, "utf8").toString("base64"),
              filename: attachment.filename,
              type: attachment.type,
              disposition: "attachment",
            })),
          }
        : {}),
    });

    return { ok: true };
  } catch (error) {
    const { message: detail, status } = describe(error);

    /*
     * A 4xx that is not 429 is SendGrid saying the request itself is wrong —
     * a malformed address, a suppressed recipient, an unverified sender.
     * Sending the identical payload four more times produces four identical
     * rejections, so the queue is told to stop now and say why. 429 and every
     * 5xx are the opposite: the same payload later is likely to work.
     */
    const permanent =
      status !== null && status >= 400 && status < 500 && status !== 429;

    return {
      ok: false,
      permanent,
      error: status === null ? detail : `${status}: ${detail}`,
    };
  }
}
