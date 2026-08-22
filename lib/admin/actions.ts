"use server";

/**
 * Every mutation the admin panel makes.
 *
 * Three rules, none of them optional:
 *
 * 1. **Each action re-checks the session.** A server action is a public HTTP
 *    endpoint that happens to be reachable by a form. `proxy.ts` does not
 *    reliably cover it — the Next docs are explicit that a matcher change or
 *    a refactor can silently drop that coverage — and a page that only renders
 *    behind a login is not authorisation. The check is here or it is nowhere.
 * 2. **Everything is validated with the Zod schemas in `lib/booking/schema.ts`.**
 *    `FormData` is strings all the way down and arrives from whatever posted
 *    it, which is not necessarily the form.
 * 3. **Every change writes an `AuditLog` row.** "Who moved this booking, and
 *    when?" is a question the studio will ask about somebody else's action,
 *    weeks later, and the only place it can be answered is a row written at
 *    the time.
 *
 * State transitions go through `lib/booking/transitions.ts` rather than
 * touching `prisma.booking.update` here. That module owns `icsSequence` and
 * the notification queue: a reschedule written directly would leave the
 * customer's calendar holding the old time and gain a second event on the
 * next update rather than replacing the first.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { currentAdmin, verifyCredentials } from "@/lib/admin/auth";
import { createSessionToken, setSessionCookie } from "@/lib/admin/session";
import {
  adminBookingStatusSchema,
  adminLoginSchema,
  fieldErrors,
  timeOffSchema,
  variantUpdateSchema,
  workingHourSchema,
} from "@/lib/booking/schema";
import {
  rescheduleBooking,
  setBookingStatus,
} from "@/lib/booking/transitions";
import { parseMinuteOfDay, studioInstant } from "@/lib/booking/time";
import { prisma } from "@/lib/db";
import { dispatchPending, sendTestMessages } from "@/lib/notifications";

const NO_SESSION: ActionState = {
  ...IDLE,
  message: "Your session has expired. Sign in again to make this change.",
};

function failed(message: string, fields?: Record<string, string>): ActionState {
  return { ok: false, message, fields };
}

function done(message: string): ActionState {
  return { ok: true, message };
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checkbox(form: FormData, key: string): boolean {
  return form.get(key) !== null;
}

async function audit(input: {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: input.meta ?? {},
    },
  });
}

/** Anything thrown out of Prisma or a transition, turned into one sentence. */
function reason(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Nothing was changed.";
}

// ── Sign in ───────────────────────────────────────────────────────────────

/**
 * Only same-origin admin paths are honoured as a post-login destination.
 * Without this the `?next=` the proxy sets would be an open redirect: a link
 * to `/admin/login/?next=https://evil.example` would bounce a signed-in admin
 * straight off the domain.
 */
function safeNext(value: string): string {
  if (!value.startsWith("/admin/") || value.startsWith("//")) {
    return "/admin/";
  }
  return value;
}

export async function loginAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse({
    email: text(form, "email"),
    password: String(form.get("password") ?? ""),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const admin = await verifyCredentials(parsed.data.email, parsed.data.password);

  /* One message for both "no such account" and "wrong password". Telling them
     apart would confirm which addresses are admins on this domain, and the
     person legitimately signing in cannot use the distinction anyway. The
     timing is levelled in `verifyCredentials`. */
  if (!admin) {
    return failed("That email and password do not match an active account.");
  }

  await setSessionCookie(
    await createSessionToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    }),
  );

  await audit({
    actor: admin.email,
    action: "admin.login",
    entity: "AdminUser",
    entityId: admin.id,
  });

  /* Outside any try/catch on purpose: `redirect` works by throwing, and a
     catch here would swallow it and leave the admin staring at the form they
     just successfully submitted. */
  redirect(safeNext(text(form, "next")));
}

// ── Bookings ──────────────────────────────────────────────────────────────

function revalidateBooking(id: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
}

export async function setBookingStatusAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const bookingId = text(form, "bookingId");
  if (!bookingId) return failed("No booking was named.");

  const parsed = adminBookingStatusSchema.safeParse({
    status: text(form, "status"),
    reason: text(form, "reason"),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const { status, reason: note } = parsed.data;

  try {
    /* Including CANCELLED. `setBookingStatus` routes that one to
       `cancelBooking` itself, which is what stamps who cancelled and why,
       frees the slot and bumps `icsSequence` — none of which a bare status
       write would do. */
    const result = await setBookingStatus({
      bookingId,
      status,
      by: "admin",
      reason: note,
    });

    if (!result.ok) return failed(result.message);
  } catch (error) {
    return failed(reason(error));
  }

  await audit({
    actor: admin.email,
    action: `booking.${status.toLowerCase()}`,
    entity: "Booking",
    entityId: bookingId,
    meta: { status, reason: note },
  });

  revalidateBooking(bookingId);

  return done(`Booking marked ${status.toLowerCase().replace("_", " ")}.`);
}

export async function rescheduleBookingAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const bookingId = text(form, "bookingId");
  if (!bookingId) return failed("No booking was named.");

  const date = text(form, "date");
  const time = text(form, "time");
  const minute = parseMinuteOfDay(time);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return failed("Check the fields below.", { date: "Pick a date." });
  }

  if (minute === null) {
    return failed("Check the fields below.", {
      time: "Enter a time as HH:MM, e.g. 14:30.",
    });
  }

  /* The date and time are what the studio reads off the wall, so they are
     studio-local. `studioInstant` is the only thing that converts them; the
     server clock is UTC and eight hours out. */
  const startAt = studioInstant(date, minute);
  const staff = text(form, "therapistId");

  try {
    const result = await rescheduleBooking({
      bookingId,
      startAt,
      ...(staff ? { staff } : {}),
      by: "admin",
    });

    if (!result.ok) return failed(result.message);
  } catch (error) {
    return failed(reason(error));
  }

  await audit({
    actor: admin.email,
    action: "booking.reschedule",
    entity: "Booking",
    entityId: bookingId,
    meta: { startAt: startAt.toISOString(), therapistId: staff || null },
  });

  revalidateBooking(bookingId);

  return done("Moved. The customer's calendar entry will update in place.");
}

// ── Schedule ──────────────────────────────────────────────────────────────

export async function addWorkingHourAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const startMinute = parseMinuteOfDay(text(form, "start"));
  const endMinute = parseMinuteOfDay(text(form, "end"));

  if (startMinute === null) {
    return failed("Check the fields below.", { start: "Enter a time as HH:MM." });
  }
  if (endMinute === null) {
    return failed("Check the fields below.", { end: "Enter a time as HH:MM." });
  }

  const parsed = workingHourSchema.safeParse({
    therapistId: text(form, "therapistId"),
    weekday: text(form, "weekday"),
    startMinute,
    endMinute,
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const created = await prisma.workingHour.create({ data: parsed.data });

  await audit({
    actor: admin.email,
    action: "workingHour.create",
    entity: "WorkingHour",
    entityId: created.id,
    meta: {
      therapistId: parsed.data.therapistId,
      weekday: parsed.data.weekday,
      startMinute: parsed.data.startMinute,
      endMinute: parsed.data.endMinute,
    },
  });

  revalidatePath("/admin/schedule");

  return done("Working hours added.");
}

export async function deleteWorkingHourAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const id = text(form, "id");
  if (!id) return failed("No working-hour block was named.");

  const existing = await prisma.workingHour.findUnique({ where: { id } });
  if (!existing) return failed("That block has already been removed.");

  await prisma.workingHour.delete({ where: { id } });

  await audit({
    actor: admin.email,
    action: "workingHour.delete",
    entity: "WorkingHour",
    entityId: id,
    meta: {
      therapistId: existing.therapistId,
      weekday: existing.weekday,
      startMinute: existing.startMinute,
      endMinute: existing.endMinute,
    },
  });

  revalidatePath("/admin/schedule");

  return done("Working hours removed.");
}

export async function addTimeOffAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const fromDate = text(form, "fromDate");
  const fromTime = text(form, "fromTime") || "00:00";
  const toDate = text(form, "toDate");
  const toTime = text(form, "toTime") || "24:00";

  const fromMinute = parseMinuteOfDay(fromTime);
  const toMinute = toTime === "24:00" ? 24 * 60 : parseMinuteOfDay(toTime);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || fromMinute === null) {
    return failed("Check the fields below.", {
      fromDate: "Give a start date and a HH:MM time.",
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate) || toMinute === null) {
    return failed("Check the fields below.", {
      toDate: "Give an end date and a HH:MM time.",
    });
  }

  const therapistId = text(form, "therapistId");

  const parsed = timeOffSchema.safeParse({
    /* An empty select means the whole studio is shut — a public holiday, not
       one person's leave — which the schema spells as a null therapist. */
    therapistId: therapistId === "" ? null : therapistId,
    startAt: studioInstant(fromDate, fromMinute).toISOString(),
    endAt: studioInstant(toDate, toMinute).toISOString(),
    reason: text(form, "reason"),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const created = await prisma.timeOff.create({
    data: {
      therapistId: parsed.data.therapistId,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      reason: parsed.data.reason,
    },
  });

  await audit({
    actor: admin.email,
    action: "timeOff.create",
    entity: "TimeOff",
    entityId: created.id,
    meta: {
      therapistId: parsed.data.therapistId,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
    },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/admin");

  return done(
    "Time off saved. Existing bookings in that window are listed below — they are not cancelled.",
  );
}

export async function deleteTimeOffAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const id = text(form, "id");
  if (!id) return failed("No time off was named.");

  const existing = await prisma.timeOff.findUnique({ where: { id } });
  if (!existing) return failed("That entry has already been removed.");

  await prisma.timeOff.delete({ where: { id } });

  await audit({
    actor: admin.email,
    action: "timeOff.delete",
    entity: "TimeOff",
    entityId: id,
    meta: {
      therapistId: existing.therapistId,
      startAt: existing.startAt.toISOString(),
      endAt: existing.endAt.toISOString(),
    },
  });

  revalidatePath("/admin/schedule");

  return done("Time off removed.");
}

// ── Services ──────────────────────────────────────────────────────────────

export async function updateVariantAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const parsed = variantUpdateSchema.safeParse({
    id: text(form, "id"),
    /* Owners type "750.000" and "Rp 750,000". The schema wants a whole number
       of rupiah, so the separators come off before it ever sees the value. */
    priceIdr: text(form, "priceIdr").replace(/[^\d]/g, ""),
    durationMinutes: text(form, "durationMinutes"),
    active: checkbox(form, "active"),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const before = await prisma.serviceVariant.findUnique({
    where: { id: parsed.data.id },
  });

  if (!before) return failed("That price row no longer exists.");

  try {
    await prisma.serviceVariant.update({
      where: { id: parsed.data.id },
      data: {
        priceIdr: parsed.data.priceIdr,
        durationMinutes: parsed.data.durationMinutes,
        active: parsed.data.active,
      },
    });
  } catch (error) {
    /* The (service, tier, duration) uniqueness is what stops two rows offering
       the same session at two prices, so this collision is worth naming. */
    return failed(
      `That service already has a ${parsed.data.durationMinutes}-minute row at this tier. ${reason(error)}`,
    );
  }

  await audit({
    actor: admin.email,
    action: "variant.update",
    entity: "ServiceVariant",
    entityId: parsed.data.id,
    meta: {
      priceFrom: before.priceIdr,
      priceTo: parsed.data.priceIdr,
      durationFrom: before.durationMinutes,
      durationTo: parsed.data.durationMinutes,
      activeFrom: before.active,
      activeTo: parsed.data.active,
    },
  });

  revalidatePath("/admin/services");

  return done(
    "Saved. Bookings already taken keep the price they were quoted, and the marketing pages are unchanged — run npm run check:prices.",
  );
}

// ── Settings ──────────────────────────────────────────────────────────────

/**
 * Re-reads the WAHA session status.
 *
 * There is nothing to write; the point is to drop the cached render so
 * `wahaHealth()` is asked again. Somebody has usually just re-scanned the QR
 * code and wants to know whether it took.
 */
export async function refreshWahaAction(): Promise<void> {
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

export async function sendTestMessageAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const email = text(form, "email");
  const phoneE164 = text(form, "phoneE164");

  if (!email && !phoneE164) {
    return failed("Give an email address, a WhatsApp number, or both.");
  }

  try {
    const result = await sendTestMessages({
      ...(email ? { email } : {}),
      ...(phoneE164 ? { phoneE164 } : {}),
    });

    await audit({
      actor: admin.email,
      action: "notification.test",
      entity: "NotificationJob",
      entityId: "test",
      meta: { email: email || null, phoneE164: phoneE164 || null },
    });

    const lines = [
      result.email ? `Email: ${result.email}` : null,
      result.whatsapp ? `WhatsApp: ${result.whatsapp}` : null,
    ].filter(Boolean);

    revalidatePath("/admin/settings");

    return done(lines.length > 0 ? lines.join(" · ") : "Test messages sent.");
  } catch (error) {
    return failed(reason(error));
  }
}

/**
 * Runs the queue by hand.
 *
 * The cron does this every few minutes anyway. The button exists for the case
 * where something was wrong, has just been fixed, and nobody wants to wait to
 * find out whether the fix worked.
 */
/* Both parameters are required by `useActionState`'s call signature and this
   action needs neither — there is nothing to read off the form. */
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function dispatchPendingAction(
  _previous: ActionState,
  _form: FormData,
): Promise<ActionState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  try {
    const result = await dispatchPending();

    await audit({
      actor: admin.email,
      action: "notification.dispatch",
      entity: "NotificationJob",
      entityId: "queue",
      meta: {
        attempted: result.attempted,
        sent: result.sent,
        failed: result.failed,
        dead: result.dead,
      },
    });

    revalidatePath("/admin/settings");

    return done(
      `Attempted ${result.attempted}: ${result.sent} sent, ${result.failed} failed, ${result.dead} given up on.`,
    );
  } catch (error) {
    return failed(reason(error));
  }
}
