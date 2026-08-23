/**
 * The booking write.
 *
 * Everything a customer sends about *what* they are booking is a suggestion.
 * The therapist, the duration, the buffer and above all the price are
 * re-derived here from the catalogue through `resolveSlot`, because the
 * request body is a text field on someone else's computer: it can offer a
 * 90-minute trauma session at 50,000 rupiah with a therapist who is on leave,
 * and the only defence is never reading those numbers in the first place.
 *
 * Notifications are not queued here. The booking commits first and the route
 * queues afterwards — see BOOKING-PLAN.md §6.1 and the note at the top of
 * `lib/booking/transitions.ts`.
 *
 * Two paths lead through this function (PAYMENT-PLAN.md §3). Paying at the
 * studio is the one that shipped first and nothing about it changed: the
 * booking is `CONFIRMED` the moment it is written and the route tells everyone
 * immediately. Paying online writes an `AWAITING_PAYMENT` hold instead, owes
 * money, and — the part that is easy to get wrong — must not cause a single
 * message to go out, because nobody has paid yet. The result says which path
 * was taken so the route cannot guess.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import { addMinutes } from "date-fns";

import { BookingStatus, PaymentMethod } from "@/generated/prisma/enums";
import { createReference } from "@/lib/booking/reference";
import type { CreateBookingPayload } from "@/lib/booking/schema";
import { resolveSlot } from "@/lib/booking/slots";
import { createManageToken } from "@/lib/booking/tokens";
import type { ApiError } from "@/lib/booking/types";
import { loadBookingById, type LoadedBooking } from "@/lib/booking/view";
import { isSlotTakenError, prisma } from "@/lib/db";
import { paymentsEnabled } from "@/lib/env";
import type { PaymentChannelValue } from "@/lib/payments/types";

/**
 * What the caller has to know beyond "it saved".
 *
 * A discriminated union rather than a nullable field: the route has to send
 * confirmations on one path and open a charge on the other, and there is no
 * arrangement of optional properties that makes doing both impossible. This
 * one does.
 */
export type CreatedPayment =
  | { method: "AT_STUDIO" }
  | {
      method: "ONLINE";
      channel: PaymentChannelValue;
      /** From the catalogue, never from the request. */
      amountIdr: number;
      holdExpiresAt: Date;
    };

export type CreateBookingResult =
  | { ok: true; booking: LoadedBooking; payment: CreatedPayment }
  | { ok: false; code: ApiError["code"]; message: string };

/** 30^5 references make a collision rare; rare is not never. */
const REFERENCE_ATTEMPTS = 5;

/**
 * How long a slot is held while somebody pays.
 *
 * Long enough to open a banking app and transfer, short enough that a customer
 * who wandered off does not cost the studio the seven o'clock on a Saturday.
 * The gateway's own expiry (`XENDIT_INVOICE_MINUTES`, 13 by default) is set
 * *under* this deliberately: a charge that outlived its hold could be paid a
 * second after the slot was released to somebody else — PAYMENT-PLAN.md §11
 * risk 3.
 */
export const PAYMENT_HOLD_MINUTES = 15;

/**
 * The furthest a hold may ever be pushed out from when the booking was made.
 *
 * Opening a replacement charge extends the hold (see the payment route), or a
 * customer whose 13-minute QRIS code lapsed would have had barely two minutes
 * to switch to a bank transfer. Extending without a ceiling is the other
 * failure: someone could keep opening charges and sit on a Saturday morning
 * indefinitely without ever paying for it.
 */
export const PAYMENT_HOLD_MAX_MINUTES = 45;

const SLOT_TAKEN_MESSAGE =
  "Sorry — someone booked that time while you were filling in your details. " +
  "Please pick another slot.";

const SAVE_FAILED_MESSAGE = "We could not save that booking. Please try again.";

/** Prisma's unique-constraint code. Only `reference` can realistically raise it. */
function isReferenceCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== "P2002") return false;

  const target = candidate.meta?.target;
  if (typeof target === "string") return target.includes("reference");
  if (Array.isArray(target)) return target.includes("reference");

  /* Some adapters do not report the target. Retrying is safe either way: the
     only other unique column on a fresh row is the placeholder token, which is
     a UUID and cannot collide. */
  return true;
}

export async function createBooking(
  input: CreateBookingPayload,
): Promise<CreateBookingResult> {
  const requestedStart = new Date(input.startAt);

  if (Number.isNaN(requestedStart.getTime())) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "That start time is not a valid date.",
    };
  }

  /* Null on the pay-at-the-studio path, and from here on that is what "online"
     means: a channel is the one thing the second path has that the first does
     not, so the rest of this function branches on it rather than on the enum. */
  let channel: PaymentChannelValue | null = null;

  if (input.paymentMethod === "ONLINE") {
    /*
     * Refused, not quietly downgraded to paying at the studio. A deployment
     * with no Xendit keys cannot open a charge or receive a callback, so a hold
     * made here would sit doing nothing until the cron swept it away; and
     * silently confirming instead would hand someone who expected to pay online
     * a booking they still believe is unpaid. Neither is a thing to decide
     * behind the customer's back.
     */
    if (!paymentsEnabled()) {
      return {
        ok: false,
        code: "VALIDATION",
        message:
          "Online payment is not available at the moment. Please choose to " +
          "pay at the studio.",
      };
    }

    /* Optional in the schema because the field means nothing on the other
       path; required here, because money has to travel on some rail. */
    if (!input.paymentChannel) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Please choose how you would like to pay.",
      };
    }

    channel = input.paymentChannel;
  }

  /* The single source of truth for this booking. `resolveSlot` re-checks the
     therapist's working hours, their time off, the lead time and the booking
     window, and hands back the catalogue's own price and duration. */
  const slot = await resolveSlot({
    staff: input.staff,
    variantId: input.variantId,
    startAt: requestedStart,
  });

  if (!slot) {
    return {
      ok: false,
      code: "SLOT_INVALID",
      message: "That time is no longer available. Please choose another slot.",
    };
  }

  /* What the constraint protects, not what the customer is told. The buffer is
     the therapist's clean-down time: it belongs inside the range Postgres uses
     to reject overlaps, and outside the times printed on the confirmation.
     `sessionEnd` in `lib/booking/view.ts` is the other half of this rule. */
  const endAt = addMinutes(
    slot.startAt,
    slot.durationMinutes + slot.bufferMinutes,
  );

  const customer = input.customer;

  /*
   * The hold, and the only thing standing between an unpaid booking and the
   * slot being sold twice. It needs nothing else: `AWAITING_PAYMENT` is inside
   * the `booking_no_overlap` exclusion constraint, so the row Postgres is about
   * to write is *already* blocking that time for everybody else. There is no
   * lock to take here, and adding one would only be a second, weaker copy of a
   * guarantee the database is making anyway.
   */
  const holdExpiresAt = channel
    ? addMinutes(new Date(), PAYMENT_HOLD_MINUTES)
    : null;

  for (let attempt = 0; attempt < REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      const bookingId = await prisma.$transaction(async (tx) => {
        /*
         * The phone number is this studio's identifier for a person: email is
         * optional and often missing, names are not unique, and WhatsApp is how
         * the studio actually reaches anybody. So a returning customer is
         * recognised by their number, and their details are refreshed from
         * whatever they typed this time.
         *
         * `findFirst` rather than `upsert` because `phoneE164` carries an index
         * but not a unique constraint. Two first-time bookings from the same
         * number in the same second could therefore create two customer rows —
         * a cosmetic duplicate the admin panel can merge. Making the column
         * unique would instead make one of those two bookings fail outright,
         * which is the worse trade.
         */
        const existing = await tx.customer.findFirst({
          where: { phoneE164: customer.phoneE164 },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        let customerId: string;

        if (existing) {
          const updated = await tx.customer.update({
            where: { id: existing.id },
            data: {
              firstName: customer.firstName,
              /* Only overwrite with something. A returning customer who leaves
                 the email blank should not lose the address the studio already
                 has for them. */
              ...(customer.lastName ? { lastName: customer.lastName } : {}),
              ...(customer.email ? { email: customer.email } : {}),
            },
            select: { id: true },
          });
          customerId = updated.id;
        } else {
          const fresh = await tx.customer.create({
            data: {
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phoneE164: customer.phoneE164,
            },
            select: { id: true },
          });
          customerId = fresh.id;
        }

        /*
         * The manage token is an HMAC over the booking id, so it cannot exist
         * before the id does. Two ways out: mint the id in application code, or
         * write a placeholder and replace it inside the same transaction. The
         * placeholder wins — `@default(cuid())` lives in the schema, and an
         * application-side generator would be a second definition of what an id
         * looks like which has to agree with the first forever, including
         * whenever Prisma changes its cuid version. The placeholder is a UUID so
         * concurrent creates cannot collide on the unique token column, and it
         * never escapes the transaction.
         */
        const created = await tx.booking.create({
          data: {
            reference: createReference(),
            manageToken: "pending-" + randomUUID(),
            customerId,
            therapistId: slot.therapistId,
            variantId: slot.variantId,
            startAt: slot.startAt,
            endAt,
            /* Paying at the studio makes a booking final the moment it is
               made; paying online makes it a hold that the callback confirms
               and the cron cancels. `PENDING` stays unused. */
            status: channel
              ? BookingStatus.AWAITING_PAYMENT
              : BookingStatus.CONFIRMED,
            paymentMethod: channel
              ? PaymentMethod.ONLINE
              : PaymentMethod.AT_STUDIO,
            /* The amount owed is the price this booking was just quoted, read
               back from the catalogue a line above — the same rule that governs
               the duration and the therapist, and for the same reason. A body
               that could name its own `amountDueIdr` would be a body that could
               buy a 90-minute session for a thousand rupiah. */
            amountDueIdr: channel ? slot.priceIdr : 0,
            holdExpiresAt,
            note: customer.note,
            priceIdrAtBooking: slot.priceIdr,
            durationMinutes: slot.durationMinutes,
            bufferMinutes: slot.bufferMinutes,
          },
          select: { id: true },
        });

        await tx.booking.update({
          where: { id: created.id },
          data: { manageToken: createManageToken(created.id) },
          select: { id: true },
        });

        return created.id;
      });

      /* Read back through the one loader every other surface uses, so the
         object the confirmation page renders is the object the emails and the
         .ics render, assembled the same way. */
      const booking = await loadBookingById(bookingId);

      if (!booking) {
        return {
          ok: false,
          code: "SERVER",
          message: "The booking was saved but could not be read back.",
        };
      }

      return {
        ok: true,
        booking,
        payment:
          channel && holdExpiresAt
            ? {
                method: "ONLINE",
                channel,
                amountIdr: slot.priceIdr,
                holdExpiresAt,
              }
            : { method: "AT_STUDIO" },
      };
    } catch (error) {
      /*
       * Two people pressed Confirm on the same slot in the same moment and
       * Postgres refused the second one. This is the constraint doing its job,
       * not a fault: it is the expected outcome of a race the application
       * cannot win on its own, so there is nothing to log and nothing to fix.
       * The customer is told plainly and sent back to the calendar.
       */
      if (isSlotTakenError(error)) {
        return { ok: false, code: "SLOT_TAKEN", message: SLOT_TAKEN_MESSAGE };
      }

      if (isReferenceCollision(error) && attempt < REFERENCE_ATTEMPTS - 1) {
        continue;
      }

      console.error("[booking] create failed", error);

      return { ok: false, code: "SERVER", message: SAVE_FAILED_MESSAGE };
    }
  }

  /* Every reference generated was already taken. At 24 million codes that means
     something is wrong with the generator, not with this request. */
  console.error("[booking] exhausted reference attempts");

  return { ok: false, code: "SERVER", message: SAVE_FAILED_MESSAGE };
}
