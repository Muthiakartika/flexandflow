/**
 * What stands between the public intake form and the database.
 *
 * A deliberate parallel to `lib/booking/guard.ts` — same honeypot and
 * Turnstile checks, same shape — kept as its own small copy rather than a
 * shared import so intake's spam rules can diverge later without touching
 * booking code. The rate limit itself is simpler here: `IntakeSubmission` has
 * its own `ipAddress` column, so there is no need for booking guard's
 * `AuditLog` workaround.
 */
import "server-only";

import { prisma } from "@/lib/db";
import { env, turnstileEnabled } from "@/lib/env";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const IP_WINDOW_MINUTES = 10;
const MINUTE = 60_000;

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Overridable per environment, same reasoning as booking's own ceilings. */
const MAX_SUBMISSIONS_PER_IP = positiveInt(
  process.env.INTAKE_MAX_PER_IP_10MIN,
  3,
);

export type GuardResult =
  | { ok: true; ip: string | null }
  | { ok: false; code: "SPAM_REJECTED" | "RATE_LIMITED"; message: string };

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  return request.headers.get("x-real-ip")?.trim() || null;
}

/** Fails **open** — see `lib/booking/guard.ts` for the reasoning: refusing
 *  every genuine client for the duration of a Cloudflare outage is worse
 *  than letting a few bots through. */
async function turnstilePassed(
  token: string | undefined,
  ip: string | null,
): Promise<boolean> {
  if (!token) return false;

  const body = new URLSearchParams({
    secret: env().TURNSTILE_SECRET_KEY ?? "",
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
    });

    if (!response.ok) return true;

    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("[intake] Turnstile verification failed", error);
    return true;
  }
}

async function withinRateLimit(ip: string | null, now: Date): Promise<boolean> {
  if (!ip) return true;

  const since = new Date(now.getTime() - IP_WINDOW_MINUTES * MINUTE);

  const count = await prisma.intakeSubmission.count({
    where: { ipAddress: ip, createdAt: { gte: since } },
  });

  return count < MAX_SUBMISSIONS_PER_IP;
}

export async function guardIntakeRequest(input: {
  request: Request;
  /** The honeypot field, exactly as it arrived. */
  website?: string | null;
  turnstileToken?: string;
  now?: Date;
}): Promise<GuardResult> {
  const ip = clientIp(input.request);

  if (input.website && input.website.trim().length > 0) {
    return {
      ok: false,
      code: "SPAM_REJECTED",
      message: "We could not accept this submission. Please try again.",
    };
  }

  if (turnstileEnabled()) {
    const passed = await turnstilePassed(input.turnstileToken, ip);
    if (!passed) {
      return {
        ok: false,
        code: "SPAM_REJECTED",
        message: "We could not accept this submission. Please try again.",
      };
    }
  }

  const allowed = await withinRateLimit(ip, input.now ?? new Date());
  if (!allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message:
        "That is a lot of submissions in a short time. Please wait a " +
        "little, or message the studio on WhatsApp.",
    };
  }

  return { ok: true, ip };
}
