/**
 * `POST /api/payments/xendit` — the only thing that turns money into a
 * confirmed booking.
 *
 * This endpoint is public and unauthenticated in the ordinary sense: Xendit
 * calls it from its own servers, so there is no session and no cookie. What
 * stands in for one is a shared secret in the `x-callback-token` header, which
 * `isAuthorisedCallback` compares in constant time. Without that check anybody
 * who learned this URL could confirm any booking for free (PAYMENT-PLAN.md §5
 * rule 2), so it happens before the body is read and before the database is
 * touched.
 *
 * The body is then used for exactly one thing: finding which charge this is
 * about. Nothing in it is believed — `settlePayment` re-fetches the charge
 * from Xendit and reads the status and the amount from there. A body with a
 * matching token still proves nothing about what is inside it.
 *
 * Nothing is logged from the request. The token is a bearer secret sent in
 * full on every call, and a header dump in a log file is how it leaks
 * (PAYMENT-PLAN.md §11 risk 12).
 */
import { after } from "next/server";

import { fail, ok, serverError } from "@/lib/api/respond";
import { prisma } from "@/lib/db";
import { paymentsEnabled } from "@/lib/env";
import { dispatchPending } from "@/lib/notifications";
import { settlePayment } from "@/lib/payments/settle";
import { isAuthorisedCallback } from "@/lib/payments/xendit";

export const dynamic = "force-dynamic";

/**
 * `after` runs inside this invocation's budget. Xendit already has its 200 by
 * then; this is only the room the email and WhatsApp send needs.
 */
export const maxDuration = 60;

/**
 * The keys Xendit might carry our own reference under.
 *
 * It names it differently per product — `external_id` on an invoice,
 * `reference_id` on a payment request or a QR code — and the newer APIs wrap
 * the payload in `data`. Rather than teach this route which product opened the
 * charge, every candidate is collected and matched against what we stored.
 * `id` is included because it is Xendit's own identifier, which we keep in
 * `Payment.providerId`: it is another way to find the row, not another way to
 * be told something.
 */
const REFERENCE_KEYS = [
  "external_id",
  "reference_id",
  "id",
  "invoice_id",
  "payment_request_id",
] as const;

/** Guards against a body that is trying to be a query rather than a reference. */
const MAX_REFERENCE_LENGTH = 128;

function referencesIn(body: unknown): string[] {
  const found: string[] = [];

  const visit = (value: unknown, depth: number): void => {
    if (depth > 2) return;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return;

    const record = value as Record<string, unknown>;

    for (const key of REFERENCE_KEYS) {
      const candidate = record[key];
      if (
        typeof candidate === "string" &&
        candidate.length > 0 &&
        candidate.length <= MAX_REFERENCE_LENGTH
      ) {
        found.push(candidate);
      }
    }

    visit(record.data, depth + 1);
  };

  visit(body, 0);

  return [...new Set(found)];
}

export async function POST(request: Request): Promise<Response> {
  /*
   * A deployment with only half the Xendit configuration must not accept money
   * it has no way to confirm — the secret key is what re-fetches the charge,
   * and without it every callback would be an unverifiable claim. Answering
   * 404 says the endpoint does not exist here, which is true.
   */
  if (!paymentsEnabled()) {
    return fail("NOT_FOUND", "Not found.");
  }

  /*
   * `ApiError` has no "unauthorised" code — no customer-facing endpoint has
   * anything to authenticate — so this borrows NOT_FOUND and overrides the
   * status, the same way the cron routes do. The response says nothing about
   * why, and nothing about the request reaches the log.
   */
  if (!isAuthorisedCallback(request)) {
    return fail("NOT_FOUND", "Not authorised.", { status: 401 });
  }

  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return fail("VALIDATION", "That callback body was not valid JSON.");
  }

  try {
    const references = referencesIn(raw);

    if (references.length === 0) {
      return fail("NOT_FOUND", "That callback carried no payment reference.");
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerRef: { in: references } },
          { providerId: { in: references } },
        ],
      },
      select: { id: true },
    });

    if (!payment) {
      return fail("NOT_FOUND", "No payment matches that reference.");
    }

    const result = await settlePayment(payment.id);

    /*
     * Only when something actually moved. A duplicate callback — and Xendit
     * sends plenty, since it retries until it gets a 200 — has queued no new
     * jobs, so there is nothing for a dispatch to find.
     */
    if (result?.applied) {
      after(async () => {
        try {
          await dispatchPending();
        } catch (error) {
          /* The customer's confirmation is already queued; a failed send here
             is retried by `/api/cron/dispatch`. It must never become a
             non-200, which would have Xendit deliver this charge again. */
          console.error("[payments] deferred dispatch failed", error);
        }
      });
    }

    /*
     * 200 even when nothing changed, and even when the charge could not be
     * re-fetched. Xendit resends a callback until it is acknowledged; a 500
     * for a charge we have already applied buys a retry loop and no new
     * information. Genuine faults still fall through to the catch below, where
     * a retry is exactly what we want.
     */
    return ok({
      received: true,
      applied: result?.applied ?? false,
      status: result?.status ?? null,
    });
  } catch (error) {
    /* No request detail in the message: the body is attacker-controlled and
       the headers hold the token. */
    console.error("[payments] xendit callback failed", error);
    return serverError("Could not process that callback.");
  }
}
