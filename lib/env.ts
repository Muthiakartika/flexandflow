/**
 * Server environment, validated once.
 *
 * A missing variable has to stop the process at boot, not surface at 11pm as
 * the string `undefined` in the middle of a WAHA URL. Everything the booking
 * system reads from the environment is declared here and nowhere else — no
 * `process.env.X` anywhere in `lib/booking`, `lib/notifications` or the route
 * handlers.
 *
 * Server only. Importing this from a client component will fail the build, and
 * should: none of these values belong in a browser bundle.
 */
import "server-only";

import { z } from "zod";

import { DEFAULT_CANCEL_CUTOFF_HOURS } from "@/lib/booking/defaults";

/** Comma-separated list → trimmed, non-empty entries. */
const list = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const schema = z.object({
  // ── Database ───────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Neon's non-pooled URL. Migrations only; the app runs on the pooled one. */
  DIRECT_URL: z.string().optional(),

  // ── Email (SendGrid) ───────────────────────────────────────────────────
  SENDGRID_API_KEY: z.string().min(1),
  /**
   * Must be on an authenticated domain. Sending as `…@gmail.com` through
   * SendGrid fails DMARC and lands in spam — see BOOKING-PLAN.md §6.2.
   */
  SENDGRID_FROM_EMAIL: z.email(),
  SENDGRID_FROM_NAME: z.string().default("Flex & Flow"),
  SENDGRID_REPLY_TO: z.email().optional(),
  ADMIN_NOTIFY_EMAILS: list,

  // ── WhatsApp (the studio's own WAHA server) ────────────────────────────
  WAHA_BASE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, "")),
  WAHA_API_KEY: z.string().min(1),
  WAHA_SESSION: z.string().default("default"),
  /** E.164, comma separated. Who gets the "new booking" WhatsApp. */
  ADMIN_WHATSAPP_NUMBERS: list,

  // ── Booking rules ──────────────────────────────────────────────────────
  BOOKING_TIMEZONE: z.string().default("Asia/Makassar"),
  BOOKING_LEAD_TIME_MINUTES: z.coerce.number().int().min(0).default(120),
  BOOKING_MAX_ADVANCE_DAYS: z.coerce.number().int().min(1).default(60),
  BOOKING_SLOT_STEP_MINUTES: z.coerce.number().int().min(5).default(30),
  /**
   * Cancelling later than this many hours before the session is refused. The
   * default lives in `lib/booking/defaults.ts` because the booking page needs
   * the same number and cannot import this module — see the note there.
   */
  BOOKING_CANCEL_CUTOFF_HOURS: z.coerce
    .number()
    .int()
    .min(0)
    .default(DEFAULT_CANCEL_CUTOFF_HOURS),
  /** HMAC key for manage-booking links and .ics URLs. */
  BOOKING_TOKEN_SECRET: z.string().min(24, "Use at least 24 random characters"),

  // ── Payments (Xendit) ──────────────────────────────────────────────────
  /**
   * Optional as a pair. With neither set the wizard offers only "pay at the
   * studio", exactly as it did before online payment existed — which is what
   * should happen while the studio's Xendit account is still being verified,
   * rather than showing a payment option that cannot work.
   */
  XENDIT_SECRET_KEY: z.string().optional(),
  /**
   * The Callback Verification Token from the Xendit dashboard.
   *
   * Xendit does not sign its callbacks; it sends this token in the
   * `x-callback-token` header, and matching it is the *only* evidence a
   * request came from Xendit. That makes it a bearer secret rather than a
   * signature: compare it in constant time, never log the header, and re-fetch
   * the charge over the API before believing anything in the body.
   * See PAYMENT-PLAN.md §5.
   */
  XENDIT_CALLBACK_TOKEN: z.string().optional(),
  /** Minutes a Xendit charge stays payable. Kept under the booking hold. */
  XENDIT_INVOICE_MINUTES: z.coerce.number().int().min(1).default(13),

  // ── Admin & cron ───────────────────────────────────────────────────────
  ADMIN_SESSION_SECRET: z.string().min(24, "Use at least 24 random characters"),
  CRON_SECRET: z.string().min(16),

  // ── Anti-spam (optional; skipped entirely when unset) ──────────────────
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // ── Public ─────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("https://flexandflow.fit")
    .transform((value) => value.replace(/\/+$/, "")),
});

export type Env = z.infer<typeof schema>;

function read(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(
      `Invalid environment for the booking system:\n${lines.join("\n")}\n\n` +
        `See .env.example for the full list.`,
    );
  }

  return parsed.data;
}

/**
 * Parsed lazily and memoised. Eager parsing at module load would break
 * `next build`, which imports route modules without a runtime environment.
 */
let cached: Env | null = null;

export function env(): Env {
  cached ??= read();
  return cached;
}

/** True when a Turnstile secret is configured; the widget is skipped otherwise. */
export function turnstileEnabled(): boolean {
  return Boolean(env().TURNSTILE_SECRET_KEY);
}

/**
 * Whether online payment can be offered at all.
 *
 * Both halves or neither: a secret key with no callback token would take money
 * it could never confirm. When this is false the wizard shows only "pay at the
 * studio" and the callback route 404s, so a half-configured deployment fails
 * closed instead of stranding a customer mid-payment.
 */
export function paymentsEnabled(): boolean {
  const { XENDIT_SECRET_KEY, XENDIT_CALLBACK_TOKEN } = env();
  return Boolean(XENDIT_SECRET_KEY && XENDIT_CALLBACK_TOKEN);
}
