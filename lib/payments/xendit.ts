/**
 * Xendit over HTTP. Nothing more.
 *
 * There is no SDK here and there should not be one: the whole integration is a
 * handful of JSON POSTs and GETs, and a dependency for that would be more code
 * than the client — plus another package with our secret key in its hands.
 *
 * The rules `lib/notifications/whatsapp.ts` follows for WAHA hold here too, for
 * the same reasons. Configuration is read lazily so `next build` can import a
 * route without a runtime environment. Every request carries an
 * `AbortSignal.timeout`, because a gateway that has stopped answering must not
 * hold a serverless function open until the platform kills it. And nothing in
 * this file writes to a log: the secret key and the callback token are both
 * bearer credentials, and an error string in the admin panel is not the place
 * for either.
 */
import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

const BASE_URL = "https://api.xendit.co";

const TIMEOUT_MS = 20_000;

/**
 * Sent on every request, though only the QR Codes API reads it — Invoice
 * carries its version in the path (`/v2/invoices`) and the virtual account and
 * e-wallet endpoints are unversioned, so they ignore the header.
 *
 * TODO(xendit): confirm the current `api-version` value for the QR Codes API,
 * and that no other endpoint we call changes behaviour when it is present.
 */
const API_VERSION = "2022-07-31";

/** Thrown when Xendit answers with an error. Carries enough to log usefully. */
export class XenditError extends Error {
  readonly status: number;
  readonly errorCode: string | null;

  constructor(
    message: string,
    status: number,
    errorCode: string | null = null,
  ) {
    super(message);
    this.name = "XenditError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

function secretKey(): string {
  const key = env().XENDIT_SECRET_KEY;

  /* `paymentsEnabled()` is meant to have kept every caller out of here. Landing
     on this line means one of them skipped the check, and a loud failure is far
     better than a charge nobody can confirm. */
  if (!key) {
    throw new XenditError("Xendit is not configured.", 0, "NOT_CONFIGURED");
  }

  return key;
}

/**
 * HTTP Basic with the secret key as the username and an empty password.
 *
 * The trailing colon is not decoration — it is the empty password, and Xendit
 * rejects the header without it.
 */
function authorisation(): string {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;
}

/** Bodies are read defensively throughout: a 500 from a proxy is not JSON. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function readRecord(
  value: unknown,
  key: string,
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "object" && found !== null && !Array.isArray(found)
    ? (found as Record<string, unknown>)
    : null;
}

export function readString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "string" && found.length > 0 ? found : null;
}

export function readNumber(value: unknown, key: string): number | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "number" && Number.isFinite(found) ? found : null;
}

export function readArray(value: unknown, key: string): unknown[] | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return Array.isArray(found) ? found : null;
}

/** A timestamp only counts if it parses. A `null` here beats an Invalid Date. */
export function readDate(value: unknown, key: string): Date | null {
  const raw = readString(value, key);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Authenticated request against the Xendit API. Never logs the key. */
export async function xenditRequest<T>(
  path: string,
  init?: { method?: string; body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const options = init ?? {};

  const headers: Record<string, string> = {
    Authorization: authorisation(),
    Accept: "application/json",
    "api-version": API_VERSION,
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  /*
   * Xendit honours this on its creation endpoints, and our `providerRef` is the
   * key we send. That is what stops a retried request — a timeout the caller
   * did not see land, a double-submitted modal — from opening a second charge
   * against one booking and taking a customer's money twice.
   */
  if (options.idempotencyKey) {
    headers["Idempotency-key"] = options.idempotencyKey;
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? `no response in ${TIMEOUT_MS / 1000}s`
        : error instanceof Error
          ? error.message
          : String(error);

    /* Status 0 rather than a made-up 5xx: nothing answered, so there is no
       status to report, and a caller deciding whether to retry should be able
       to tell "never arrived" from "arrived and was refused". */
    throw new XenditError(`Xendit unreachable: ${reason}`, 0, "UNREACHABLE");
  }

  const body = await readJson(response);

  if (!response.ok) {
    throw new XenditError(
      readString(body, "message") ?? `Xendit answered ${response.status}.`,
      response.status,
      readString(body, "error_code"),
    );
  }

  /*
   * Fail at the boundary, not three lines into the database write. A body that
   * is not an object means the shape we are about to read fields out of does
   * not exist, and writing the resulting nulls into `Payment` would produce a
   * charge row nobody can pay against and nothing to explain why.
   */
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new XenditError(
      "Xendit returned a body that was not a JSON object.",
      response.status,
      "UNEXPECTED_RESPONSE",
    );
  }

  return body as T;
}

/** Constant-time comparison of the `x-callback-token` header. */
export function isAuthorisedCallback(request: Request): boolean {
  const expected = env().XENDIT_CALLBACK_TOKEN;

  /* Fail closed. With no token configured there is nothing to prove a request
     came from Xendit, and an unauthenticated endpoint that confirms bookings is
     worse than one that is switched off. */
  if (!expected) return false;

  const provided = request.headers.get("x-callback-token") ?? "";

  /*
   * Xendit does not sign its callbacks — matching this shared secret is the
   * only evidence a request is genuine (PAYMENT-PLAN §5). A plain `===` leaks
   * how much of a guessed token was right through how long the comparison took,
   * which is enough to rebuild it a byte at a time. Same reasoning, same
   * shape, as `isAuthorisedCron()` in `lib/booking/tokens.ts`.
   */
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
