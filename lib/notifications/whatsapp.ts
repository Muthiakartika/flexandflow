/**
 * The studio's own WAHA server, over HTTP. Nothing more.
 *
 * WAHA runs a real WhatsApp Web session on a VPS the owner controls. This app
 * does not manage that session, scan its QR, or reimplement any part of it —
 * it posts text at it and reports what came back.
 *
 * Two rules hold throughout. Every request carries an `AbortSignal.timeout`,
 * because a WAHA that has stopped answering must not hold a serverless
 * function open until the platform kills it. And neither the API key nor a
 * customer's full number is ever written to a log or into an error string:
 * `lastError` is read in the admin panel, and a phone number is not a
 * debugging detail.
 */
import "server-only";

import { env } from "@/lib/env";
import type { DeliveryResult } from "@/lib/notifications/jobs";

const HEALTH_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 20_000;

/** Digits only — the form WAHA wants everywhere it takes a number. */
function digitsOf(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}

/**
 * `+6285858887777` → `6285858887777@c.us`.
 *
 * The one place this transformation is written. WAHA rejects a chatId with a
 * `+`, with spaces, or without the suffix, and each of those is a silent
 * delivery failure rather than an obvious one.
 */
export function toChatId(phoneE164: string): string {
  return `${digitsOf(phoneE164)}@c.us`;
}

/** `+6285858887777` → `+62…777`. What goes in an error the admin panel shows. */
export function maskPhone(phoneE164: string): string {
  const digits = digitsOf(phoneE164);
  if (digits.length < 6) return "…";
  return `+${digits.slice(0, 2)}…${digits.slice(-3)}`;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": env().WAHA_API_KEY,
  };
}

/** Response bodies are read defensively: WAHA versions differ in shape. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "string" ? found : null;
}

/**
 * Whether the number has a WhatsApp account.
 *
 * `null` means the check itself did not answer. That is deliberately not
 * treated as "no": a check-exists endpoint that is down is a reason to try the
 * send anyway, not a reason to drop a customer's confirmation.
 */
async function numberExists(phoneE164: string): Promise<boolean | null> {
  const config = env();
  const url =
    `${config.WAHA_BASE_URL}/api/contacts/check-exists` +
    `?phone=${encodeURIComponent(digitsOf(phoneE164))}` +
    `&session=${encodeURIComponent(config.WAHA_SESSION)}`;

  try {
    const response = await fetch(url, {
      headers: headers(),
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const body = await readJson(response);
    if (typeof body !== "object" || body === null) return null;

    const exists = (body as Record<string, unknown>).numberExists;
    return typeof exists === "boolean" ? exists : null;
  } catch {
    return null;
  }
}

export async function sendWhatsAppText(
  phoneE164: string,
  text: string,
): Promise<DeliveryResult> {
  const config = env();

  /*
   * A number with no WhatsApp account will never accept a message, however
   * many times it is offered one. Marking it permanent here is what stops the
   * queue spending five retries over seven hours on a typo'd digit — the
   * email still goes out, which is the point of sending both.
   */
  if ((await numberExists(phoneE164)) === false) {
    return {
      ok: false,
      permanent: true,
      error: `${maskPhone(phoneE164)} has no WhatsApp account.`,
    };
  }

  try {
    const response = await fetch(`${config.WAHA_BASE_URL}/api/sendText`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        session: config.WAHA_SESSION,
        chatId: toChatId(phoneE164),
        text,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (response.ok) return { ok: true };

    const body = await response.text();

    /*
     * Everything else retries, including 4xx. The failure this endpoint
     * actually produces in practice is a session that has quietly logged out,
     * and that is fixed by someone rescanning the QR — after which the
     * pending jobs deliver on their own. Giving up on the first 401 would
     * throw away every message queued during the outage.
     */
    return {
      ok: false,
      permanent: false,
      error: `WAHA ${response.status}: ${body.slice(0, 200)}`,
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? `no response in ${SEND_TIMEOUT_MS / 1000}s`
        : error instanceof Error
          ? error.message
          : String(error);

    return { ok: false, permanent: false, error: `WAHA unreachable: ${reason}` };
  }
}

/**
 * The session's own view of itself.
 *
 * Never throws, including when the environment is missing entirely — the admin
 * settings page calls this to render a banner, and a health check that crashes
 * the page it exists to reassure is worse than no health check.
 */
export async function wahaSessionStatus(): Promise<{
  ok: boolean;
  status: string;
  detail?: string;
}> {
  try {
    const config = env();
    const response = await fetch(
      `${config.WAHA_BASE_URL}/api/sessions/${encodeURIComponent(config.WAHA_SESSION)}`,
      { headers: headers(), signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) },
    );

    if (!response.ok) {
      return {
        ok: false,
        status: "UNREACHABLE",
        detail: `WAHA answered ${response.status}.`,
      };
    }

    const body = await readJson(response);
    const status = readString(body, "status") ?? "UNKNOWN";

    /* Only WORKING means messages will actually leave. SCAN_QR_CODE, STARTING,
       STOPPED and FAILED all mean the studio has to do something. */
    return status === "WORKING"
      ? { ok: true, status }
      : {
          ok: false,
          status,
          detail: `The WhatsApp session is ${status}, not WORKING. Messages will queue until it is reconnected.`,
        };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? `No response in ${HEALTH_TIMEOUT_MS / 1000}s.`
        : error instanceof Error
          ? error.message
          : String(error);

    return { ok: false, status: "UNREACHABLE", detail: reason };
  }
}
