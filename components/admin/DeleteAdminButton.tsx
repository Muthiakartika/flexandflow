"use client";

import { useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { deleteAdminAction } from "@/lib/admin/team-actions";

/**
 * Removes an admin account. Two presses, disarming on its own after a few
 * seconds — the same shape as `DeleteBookingButton`, for the same reason: it
 * sits beside ordinary controls and leaves nothing behind.
 *
 * The server decides whether this is a soft delete (the account authored
 * content and its byline has to keep resolving) or a real one, and refuses
 * outright for your own account and for the last active super admin. This only
 * decides what to draw.
 */
const DISARM_AFTER_MS = 5000;

export function DeleteAdminButton({
  adminId,
  name,
}: {
  adminId: string;
  name: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    deleteAdminAction,
    IDLE,
  );
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const refused = !state.ok && state.message !== null;

  if (!armed) {
    return (
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-left text-[13px] text-faint underline underline-offset-2 hover:text-danger"
        >
          Delete account
        </button>
        {refused ? (
          <p className="max-w-[40ch] text-[12px] text-danger">{state.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="id" value={adminId} />

      <div>
        <SubmitButton variant="danger" pendingLabel="Deleting…">
          Delete {name}?
        </SubmitButton>
      </div>

      {refused ? (
        <p className="max-w-[40ch] text-[12px] text-danger">{state.message}</p>
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
