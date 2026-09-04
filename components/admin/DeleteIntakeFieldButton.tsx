"use client";

import { useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { deleteIntakeFieldAction } from "@/lib/intake/actions";

/**
 * Same two-press, self-disarming shape as `DeleteAdminButton` — sits beside
 * an ordinary "Save" and must not be one accidental click away from gone.
 *
 * Removes any active field from the public form. Its definition is archived
 * so an admin can restore it and historical submissions remain readable.
 */
const DISARM_AFTER_MS = 5000;

export function DeleteIntakeFieldButton({
  fieldId,
  label,
}: {
  fieldId: string;
  label: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    deleteIntakeFieldAction,
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
          className="min-h-11 text-left text-[13px] text-faint underline underline-offset-2 hover:text-danger"
        >
          Delete field
        </button>
        {refused ? (
          <p className="max-w-[40ch] text-[12px] text-danger">{state.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="id" value={fieldId} />

      <div>
        <SubmitButton variant="danger" pendingLabel="Deleting…">
          Delete {label}?
        </SubmitButton>
      </div>

      {refused ? (
        <p className="max-w-[40ch] text-[12px] text-danger">{state.message}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setArmed(false)}
        className="min-h-11 text-left text-[12px] text-faint underline underline-offset-2"
      >
        Keep it
      </button>
    </form>
  );
}
