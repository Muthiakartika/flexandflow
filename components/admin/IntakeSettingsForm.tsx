"use client";

import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { updateIntakeSettingsAction } from "@/lib/intake/actions";
import type { IntakeSettingsRow } from "@/lib/intake/settings";

export function IntakeSettingsForm({ settings }: { settings: IntakeSettingsRow }) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateIntakeSettingsAction,
    IDLE,
  );

  return (
    <form action={action}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="admin-label" htmlFor="shareEmail1">
            Gmail address 1
          </label>
          <input
            id="shareEmail1"
            name="shareEmail1"
            type="email"
            defaultValue={settings.shareEmail1 ?? ""}
            className="admin-input"
          />
        </div>
        <div>
          <label className="admin-label" htmlFor="shareEmail2">
            Gmail address 2
          </label>
          <input
            id="shareEmail2"
            name="shareEmail2"
            type="email"
            defaultValue={settings.shareEmail2 ?? ""}
            className="admin-input"
          />
        </div>
      </div>

      <div className="mt-3">
        <SubmitButton pendingLabel="Saving…" variant="quiet">
          Save
        </SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
