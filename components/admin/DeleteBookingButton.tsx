"use client";

import { useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { deleteBookingAction } from "@/lib/admin/actions";

/**
 * Deletes one booking, from the row it is in.
 *
 * Two presses, because this is the only control in the panel that leaves
 * nothing behind and it sits directly beside "Open" in a dense table — a
 * mis-aimed click on a list of ten rows should not erase one of them. The
 * first press arms it and nothing has been sent; the second submits.
 *
 * Armed state times out on its own. A half-pressed button left across the
 * table while somebody reads a different row is a trap for whoever comes back
 * to it, so it disarms after a few seconds and has to be meant again.
 *
 * The server re-derives what may be deleted; this only decides what to draw.
 * See `deleteBookingAction`.
 */
const DISARM_AFTER_MS = 5000;

export function DeleteBookingButton({
  bookingId,
  reference,
}: {
  bookingId: string;
  /** Named in the confirm label, so it is clear which row is about to go. */
  reference: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    deleteBookingAction,
    IDLE,
  );
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  /* A refusal is the server's, and it means the row is not what this page
     thought it was — a booking paid for since the list was rendered, most
     likely. Shown wherever the button currently is rather than used to move
     it: disarming on a refusal would take the retry away at the moment it is
     wanted, and deriving the armed state from it would leave the button
     unable to arm again while the message stood. */
  const refused = !state.ok && state.message !== null;

  if (!armed) {
    return (
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-left text-[13px] text-faint underline underline-offset-2 hover:text-danger"
        >
          Delete
        </button>

        {refused ? (
          <p className="max-w-[22ch] text-[12px] text-danger">{state.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />

      <SubmitButton variant="danger" pendingLabel="Deleting…">
        Delete {reference}?
      </SubmitButton>

      {refused ? (
        <p className="max-w-[22ch] text-[12px] text-danger">{state.message}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-left text-[12px] text-faint underline underline-offset-2"
      >
        Keep it
      </button>
    </form>
  );
}
