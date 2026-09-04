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

/**
 * A credential, cleaned of the punctuation a dashboard paste tends to carry.
 *
 * `.env` files are read by dotenv, which strips surrounding quotes before the
 * value ever reaches us. Hosting dashboards do not: paste `"xnd_development_…"`
 * into Vercel with the quotes it was written with and the quotes become part of
 * the key. So does a trailing newline picked up by a triple-click.
 *
 * All three were verified against Xendit to produce exactly the same answer —
 * `401 INVALID_API_KEY` — which points at the key rather than at its
 * punctuation and is a genuinely hard afternoon to spend. Trimming here costs
 * nothing and no legitimate secret has a quote or a space at either end.
 */
const secret = () =>
  z
    .string()
    /* `[\s\S]` rather than `.` with the `s` flag: the project targets ES2017,
       where that flag does not exist. */
    .transform((value) => value.trim().replace(/^["']([\s\S]*)["']$/, "$1"));

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
  SENDGRID_API_KEY: secret().pipe(z.string().min(1)),
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
  WAHA_API_KEY: secret().pipe(z.string().min(1)),
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
  BOOKING_TOKEN_SECRET: secret().pipe(
    z.string().min(24, "Use at least 24 random characters"),
  ),

  // ── Payments (Xendit) ──────────────────────────────────────────────────
  /**
   * Optional as a pair. With neither set the wizard offers only "pay at the
   * studio", exactly as it did before online payment existed — which is what
   * should happen while the studio's Xendit account is still being verified,
   * rather than showing a payment option that cannot work.
   */
  XENDIT_SECRET_KEY: secret().optional(),
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
  XENDIT_CALLBACK_TOKEN: secret().optional(),
  /**
   * The *public* key, and it is meant to be public: it reaches the browser, so
   * `NEXT_PUBLIC_` is the honest prefix. It can only tokenise a card, never
   * move money — that still needs the secret key, server-side.
   *
   * This is what keeps the card form on our own page. Xendit.js exchanges the
   * card number for a token in the browser, so the number never touches this
   * server and never appears in a log or a backup.
   */
  NEXT_PUBLIC_XENDIT_PUBLIC_KEY: secret().optional(),
  /** Minutes a Xendit charge stays payable. Kept under the booking hold. */
  XENDIT_INVOICE_MINUTES: z.coerce.number().int().min(1).default(13),

  // ── Admin & cron ───────────────────────────────────────────────────────
  ADMIN_SESSION_SECRET: secret().pipe(
    z.string().min(24, "Use at least 24 random characters"),
  ),
  CRON_SECRET: secret().pipe(z.string().min(16)),

  // ── Anti-spam (optional; skipped entirely when unset) ──────────────────
  TURNSTILE_SECRET_KEY: secret().optional(),

  // ── Google (Sheets export for the intake form) ─────────────────────────
  /**
   * Optional as a trio, same reasoning as Xendit and Cloudflare below: a
   * half-configured deployment must fail closed (skip the Sheets append,
   * still save the submission) rather than crash or half-send.
   */
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.email().optional(),
  /**
   * Dashboards mangle a multi-line PEM the same way they mangle every other
   * secret here — see `secret()` above — but a private key also arrives with
   * literal `\n` sequences instead of real newlines, which `secret()` alone
   * does not fix. Unescaped once here so every caller gets an already-usable
   * key.
   */
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: secret()
    .optional()
    .transform((value) => value?.replace(/\\n/g, "\n")),
  GOOGLE_SHEET_ID: secret().optional(),

  // ── Cloudflare (cache purge) ───────────────────────────────────────────
  /**
   * Optional as a pair, and for the same reason payments are: a zone with no
   * token, or a token with no zone, cannot purge anything, and an endpoint
   * that answers 200 without having made a request tells a deploy pipeline the
   * cache was cleared when it was not.
   *
   * The zone ID is not a secret — it is in the dashboard sidebar and identifies
   * nothing on its own — but it lives here so both halves are validated in one
   * place. The token is: it can empty this zone's cache, and nothing else.
   */
  CLOUDFLARE_ZONE_ID: secret().optional(),
  CLOUDFLARE_API_TOKEN: secret().optional(),

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

/**
 * Whether cards can be collected on our own page.
 *
 * Separate from `paymentsEnabled()` because it fails differently: without the
 * public key the browser cannot tokenise anything, so the card option is left
 * off the list rather than offered and then broken at the last step. QRIS and
 * bank transfer are unaffected and keep working.
 */
export function cardPaymentsEnabled(): boolean {
  return paymentsEnabled() && Boolean(env().NEXT_PUBLIC_XENDIT_PUBLIC_KEY);
}

/**
 * Whether `/api/cache/purge/` can do anything.
 *
 * Both halves or neither. False makes that route 404 rather than pretend, so a
 * deployment configured without Cloudflare credentials reports a failed purge
 * instead of a silent one.
 */
export function cachePurgeEnabled(): boolean {
  const { CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN } = env();
  return Boolean(CLOUDFLARE_ZONE_ID && CLOUDFLARE_API_TOKEN);
}

/**
 * Whether the intake form can append to the studio's Google Sheet.
 *
 * All three or none: a service account with no target sheet, or a sheet id
 * with no credentials, cannot append anything. False makes the sync step
 * skip silently (logged, `IntakeSubmission.sheetSyncError` set) rather than
 * throw — the submission itself must never be blocked by this.
 */
export function sheetsEnabled(): boolean {
  const {
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_SHEET_ID,
  } = env();
  return Boolean(
    GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      GOOGLE_SHEET_ID,
  );
}
