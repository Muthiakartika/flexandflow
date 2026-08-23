/**
 * What stands between the public booking form and the diary.
 *
 * Three checks, cheapest first: a honeypot that costs nothing, a Turnstile
 * verification that costs one HTTP round trip, and a rate limit that costs one
 * `count`. Anything that fails is refused before `createBooking` is called, so
 * a bot never reaches the exclusion constraint.
 */
import "server-only";

import { prisma } from "@/lib/db";
import { env, turnstileEnabled } from "@/lib/env";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/*
 * Ceilings, named so they can be argued with.
 *
 * The studio has two therapists. A couple booking back-to-back sessions, or a
 * family of three arranging a morning together, is real and must go through;
 * a fifth booking from one phone inside an hour is not a family, and a seventh
 * from one address inside ten minutes is a script.
 */
const PHONE_WINDOW_MINUTES = 60;
const IP_WINDOW_MINUTES = 10;

/**
 * Overridable, because a staging deployment is not a studio.
 *
 * Testing the payment flow means booking the same slot from the same phone over
 * and over, which trips these within minutes and then looks like a gateway
 * fault rather than a limit working. Production leaves them alone; staging
 * raises them in the environment rather than by editing this file, which is how
 * a relaxed limit ends up shipped by accident.
 */
const MAX_BOOKINGS_PER_PHONE = positiveInt(
  process.env.BOOKING_MAX_PER_PHONE_HOUR,
  4,
);
const MAX_BOOKINGS_PER_IP = positiveInt(
  process.env.BOOKING_MAX_PER_IP_10MIN,
  6,
);

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const MINUTE = 60_000;

export type GuardResult =
  | { ok: true; ip: string | null }
  | { ok: false; code: "SPAM_REJECTED" | "RATE_LIMITED"; message: string };

/**
 * The caller's address, as far as it can be known behind Vercel's proxy.
 *
 * `x-forwarded-for` is a chain — `client, proxy1, proxy2` — and the first
 * entry is the one that matters. Everything after it was added by
 * infrastructure and would collapse every visitor into a single bucket.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  return request.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Cloudflare's siteverify.
 *
 * Fails **open** when the verification itself cannot be completed. If
 * Cloudflare is unreachable the choice is between letting a few bots through
 * and refusing every genuine customer for the duration of the outage, and the
 * second is the worse failure for a studio that lives on these bookings.
 */
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
    console.error("[booking] Turnstile verification failed", error);
    return true;
  }
}

/**
 * Rate limiting without a rate-limit table.
 *
 * The obvious implementation — a counter in a module-level `Map` — does
 * nothing here. Every request may land in a fresh serverless invocation with
 * its own empty memory, so the counter is almost always zero and the limit
 * never fires. The only shared state this app has is Postgres, and the abuse
 * actually worth stopping leaves its evidence there anyway: the thing being
 * limited is *bookings created*, and bookings are rows. Counting them costs
 * one indexed query and needs no schema of its own.
 *
 * The IP side counts `AuditLog` rows rather than `Booking` rows, because a
 * booking does not record where it came from. `recordBookingOrigin` below
 * writes that row, and it doubles as the creation entry in the audit trail.
 */
async function withinRateLimits(
  phoneE164: string,
  ip: string | null,
  now: Date,
): Promise<boolean> {
  const phoneSince = new Date(now.getTime() - PHONE_WINDOW_MINUTES * MINUTE);

  const fromPhone = await prisma.booking.count({
    where: {
      createdAt: { gte: phoneSince },
      customer: { is: { phoneE164 } },
      /* A hold the cron cancelled is not an attempt at anything — it is
         somebody whose QRIS code lapsed, or who changed their mind at the
         payment screen. Counting those made the limit punish the one customer
         it should be most patient with: fumble the payment twice and a third,
         genuine try would be refused. Cancellations by a person still count;
         only the system's own sweep is forgiven. */
      NOT: { status: "CANCELLED", cancelledBy: "system" },
    },
  });

  if (fromPhone >= MAX_BOOKINGS_PER_PHONE) return false;

  if (!ip) return true;

  const ipSince = new Date(now.getTime() - IP_WINDOW_MINUTES * MINUTE);

  const fromIp = await prisma.auditLog.count({
    where: {
      actor: originActor(ip),
      action: BOOKING_CREATED_ACTION,
      createdAt: { gte: ipSince },
    },
  });

  return fromIp < MAX_BOOKINGS_PER_IP;
}

const BOOKING_CREATED_ACTION = "booking.created";

function originActor(ip: string): string {
  return `ip:${ip}`;
}

/**
 * Every check the public booking route runs before it writes anything.
 *
 * Returns the caller's IP on success so the route can hand it straight to
 * `recordBookingOrigin` instead of reading the headers a second time.
 */
export async function guardBookingRequest(input: {
  request: Request;
  phoneE164: string;
  /** The honeypot field, exactly as it arrived. */
  website?: string | null;
  turnstileToken?: string;
  now?: Date;
}): Promise<GuardResult> {
  const ip = clientIp(input.request);

  /* A human never sees this field, so anything in it came from something that
     fills every input it finds. The message says nothing about what tripped —
     a bot that learns which field gave it away simply stops filling that one. */
  if (input.website && input.website.trim().length > 0) {
    return {
      ok: false,
      code: "SPAM_REJECTED",
      message: "We could not accept this booking. Please try again.",
    };
  }

  /* Verified only when a secret is configured. With the check keyed off the
     same condition the widget uses, the browser and the server can never
     disagree about whether Turnstile is on — which would otherwise reject
     every booking made from a page that never rendered the widget. */
  if (turnstileEnabled()) {
    const passed = await turnstilePassed(input.turnstileToken, ip);
    if (!passed) {
      return {
        ok: false,
        code: "SPAM_REJECTED",
        message: "We could not accept this booking. Please try again.",
      };
    }
  }

  const allowed = await withinRateLimits(
    input.phoneE164,
    ip,
    input.now ?? new Date(),
  );

  if (!allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message:
        "That is a lot of bookings in a short time. Please wait a little, " +
        "or message the studio on WhatsApp.",
    };
  }

  return { ok: true, ip };
}

/**
 * Records which address a booking came from.
 *
 * This is the row the IP rate limit counts, and the only place a booking's
 * origin is written down — `createBooking` takes a validated payload and has
 * no request to read. It is deliberately best-effort: the booking is already
 * committed by the time this runs, and losing an audit line is not a reason to
 * show the customer an error.
 */
export async function recordBookingOrigin(input: {
  bookingId: string;
  ip: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: input.ip ? originActor(input.ip) : "customer",
        action: BOOKING_CREATED_ACTION,
        entity: "Booking",
        entityId: input.bookingId,
      },
    });
  } catch (error) {
    console.error("[booking] could not record booking origin", error);
  }
}
