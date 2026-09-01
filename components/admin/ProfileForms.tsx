"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  changeOwnPasswordAction,
  updateOwnProfileAction,
} from "@/lib/admin/team-actions";

/**
 * Your own name and email.
 *
 * Role and status are deliberately not here. This page is reachable by every
 * admin, and it is the obvious place to try to promote yourself — so the form
 * does not offer the fields and the action ignores them if they are posted.
 */
export function OwnProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateOwnProfileAction,
    IDLE,
  );

  const fields = state.fields ?? {};

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="admin-label" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            name="name"
            type="text"
            required
            maxLength={80}
            autoComplete="name"
            defaultValue={name}
            className="admin-input"
          />
          <FieldError message={fields.name} />
        </div>

        <div>
          <label className="admin-label" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={email}
            className="admin-input"
          />
          <FieldError message={fields.email} />
          <p className="mt-1 text-[12px] text-faint">
            Changing this changes the address you sign in with.
          </p>
        </div>
      </div>

      <div>
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}

/**
 * Your own password. Asks for the current one first.
 *
 * Not ceremony: a session cookie is all it takes to reach this form, so the
 * realistic threat is the studio laptop left open at reception rather than a
 * stolen hash. Without the current password, anyone who found the panel open
 * could lock the owner out of it in two fields.
 */
export function OwnPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    changeOwnPasswordAction,
    IDLE,
  );

  const fields = state.fields ?? {};

  return (
    <form action={action} className="grid gap-4">
      <div className="sm:max-w-[60%]">
        <label className="admin-label" htmlFor="current-password">
          Current password
        </label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="admin-input"
        />
        <FieldError message={fields.currentPassword} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="admin-label" htmlFor="profile-new-password">
            New password
          </label>
          <input
            id="profile-new-password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="admin-input"
          />
          <FieldError message={fields.password} />
          <p className="mt-1 text-[12px] text-faint">At least 10 characters.</p>
        </div>

        <div>
          <label className="admin-label" htmlFor="profile-confirm">
            Repeat new password
          </label>
          <input
            id="profile-confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className="admin-input"
          />
          <FieldError message={fields.confirm} />
        </div>
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
