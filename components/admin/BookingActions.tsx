"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  rescheduleBookingAction,
  setBookingStatusAction,
} from "@/lib/admin/actions";
import type { TherapistOption } from "@/lib/admin/queries";
import type { BookingStatusValue } from "@/lib/booking/types";

/**
 * What an admin can do to one booking.
 *
 * Two independent action states: marking a session complete and moving it are
 * different operations with different failure modes, and one shared message
 * box would attribute a reschedule refusal to whichever button was pressed
 * last.
 */
export function BookingActions({
  bookingId,
  status,
  therapists,
  therapistId,
  defaultDate,
  defaultTime,
}: {
  bookingId: string;
  status: BookingStatusValue;
  therapists: TherapistOption[];
  therapistId: string;
  defaultDate: string;
  defaultTime: string;
}) {
  const [statusState, statusAction] = useActionState<ActionState, FormData>(
    setBookingStatusAction,
    IDLE,
  );
  const [moveState, moveAction] = useActionState<ActionState, FormData>(
    rescheduleBookingAction,
    IDLE,
  );

  const open = status === "CONFIRMED" || status === "PENDING";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="admin-card p-4">
        <h2 className="mb-1 text-[15px] font-bold text-ink">Mark the outcome</h2>
        <p className="mb-3 text-[13px] text-muted">
          Completed and no-show are what the takings and the therapist&rsquo;s
          record are counted from. Neither sends the customer anything.
        </p>

        <div className="flex flex-wrap gap-2">
          <form action={statusAction}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <input type="hidden" name="status" value="COMPLETED" />
            <SubmitButton pendingLabel="Saving…" variant="quiet">
              Mark completed
            </SubmitButton>
          </form>

          <form action={statusAction}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <input type="hidden" name="status" value="NO_SHOW" />
            <SubmitButton pendingLabel="Saving…" variant="quiet">
              Mark no-show
            </SubmitButton>
          </form>

          {status !== "CONFIRMED" ? (
            <form action={statusAction}>
              <input type="hidden" name="bookingId" value={bookingId} />
              <input type="hidden" name="status" value="CONFIRMED" />
              <SubmitButton pendingLabel="Saving…" variant="quiet">
                Back to confirmed
              </SubmitButton>
            </form>
          ) : null}
        </div>

        <form action={statusAction} className="mt-4 border-t border-line pt-4">
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="status" value="CANCELLED" />

          <label className="admin-label" htmlFor="cancel-reason">
            Reason for cancelling
          </label>
          <textarea
            id="cancel-reason"
            name="reason"
            rows={2}
            className="admin-input"
            placeholder="Therapist unwell, customer rang to move it, …"
          />
          <FieldError message={statusState.fields?.reason} />

          <p className="mt-2 text-[12px] text-muted">
            Cancelling frees the slot and messages the customer. It cannot be
            taken back — rebooking them is a new booking.
          </p>

          <div className="mt-2">
            <SubmitButton pendingLabel="Cancelling…" variant="danger">
              Cancel this booking
            </SubmitButton>
          </div>
        </form>

        <FormMessage state={statusState} />
      </section>

      <section className="admin-card p-4">
        <h2 className="mb-1 text-[15px] font-bold text-ink">Move it</h2>
        <p className="mb-3 text-[13px] text-muted">
          Times are Bali time (WITA), the same clock as the wall in the studio.
          Moving re-issues the calendar entry the customer already has rather
          than adding a second one, and tells them the new time.
        </p>

        <form action={moveAction}>
          <input type="hidden" name="bookingId" value={bookingId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="admin-label" htmlFor="move-date">
                New date
              </label>
              <input
                id="move-date"
                name="date"
                type="date"
                required
                defaultValue={defaultDate}
                className="admin-input"
              />
              <FieldError message={moveState.fields?.date} />
            </div>

            <div>
              <label className="admin-label" htmlFor="move-time">
                New start time (HH:MM)
              </label>
              <input
                id="move-time"
                name="time"
                type="time"
                required
                defaultValue={defaultTime}
                className="admin-input"
              />
              <FieldError message={moveState.fields?.time} />
            </div>
          </div>

          <div className="mt-3">
            <label className="admin-label" htmlFor="move-therapist">
              Therapist
            </label>
            <select
              id="move-therapist"
              name="therapistId"
              defaultValue={therapistId}
              className="admin-input"
            >
              {therapists
                .filter(
                  (therapist) => therapist.active || therapist.id === therapistId,
                )
                .map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.displayName}
                  </option>
                ))}
            </select>
          </div>

          <div className="mt-3">
            <SubmitButton pendingLabel="Moving…" variant="solid">
              Move booking
            </SubmitButton>
          </div>
        </form>

        {!open ? (
          <p className="mt-2 text-[12px] font-bold text-warn">
            This booking is {status.toLowerCase().replace("_", " ")}. Moving it
            may be refused.
          </p>
        ) : null}

        <FormMessage state={moveState} />
      </section>
    </div>
  );
}
