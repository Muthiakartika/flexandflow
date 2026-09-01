"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { setAdminPasswordAction } from "@/lib/admin/team-actions";

/**
 * Replaces another admin's password.
 *
 * Its own form, away from the details form, because the two failures are
 * different: mistyping a name is a typo, and mistyping this locks somebody
 * out. The current password is never asked for and the stored one is never
 * shown — there is nothing on this page that could display it, by design.
 */
export function AdminPasswordForm({
  adminId,
  name,
}: {
  adminId: string;
  name: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    setAdminPasswordAction,
    IDLE,
  );

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={adminId} />

      <div className="sm:max-w-[60%]">
        <label className="admin-label" htmlFor="new-password">
          New password for {name}
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="admin-input"
        />
        <FieldError message={state.fields?.password} />
        <p className="mt-1 text-[12px] text-faint">
          At least 10 characters. They are not told automatically — pass it on
          yourself.
        </p>
      </div>

      <div>
        <SubmitButton variant="quiet" pendingLabel="Changing…">
          Change password
        </SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
