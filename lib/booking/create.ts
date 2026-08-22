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
 */
import "server-only";

import { randomUUID } from "node:crypto";

import { addMinutes } from "date-fns";

import { BookingStatus } from "@/generated/prisma/enums";
import { createReference } from "@/lib/booking/reference";
import type { CreateBookingPayload } from "@/lib/booking/schema";
import { resolveSlot } from "@/lib/booking/slots";
import { createManageToken } from "@/lib/booking/tokens";
import type { ApiError } from "@/lib/booking/types";
import { loadBookingById, type LoadedBooking } from "@/lib/booking/view";
import { isSlotTakenError, prisma } from "@/lib/db";

export type CreateBookingResult =
  | { ok: true; booking: LoadedBooking }
  | { ok: false; code: ApiError["code"]; message: string };

/** 30^5 references make a collision rare; rare is not never. */
const REFERENCE_ATTEMPTS = 5;

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
            /* v1 has no payment step, so a booking is final the moment it is
               made. `PENDING` is reserved for the gateway — BOOKING-PLAN §9. */
            status: BookingStatus.CONFIRMED,
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

      return { ok: true, booking };
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
