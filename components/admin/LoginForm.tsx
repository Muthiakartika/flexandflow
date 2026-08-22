"use client";

import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { loginAction } from "@/lib/admin/actions";
import { FieldError } from "@/components/admin/primitives";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    loginAction,
    IDLE,
  );

  return (
    <form action={action} noValidate>
      {/* Where the proxy was taking them before it asked for a password. The
          action refuses anything that is not an `/admin/` path, so this cannot
          be turned into an open redirect by editing the URL. */}
      <input type="hidden" name="next" value={next} />

      <div className="mb-3">
        <label className="admin-label" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="admin-input"
        />
        <FieldError message={state.fields?.email} />
      </div>

      <div className="mb-4">
        <label className="admin-label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="admin-input"
        />
        <FieldError message={state.fields?.password} />
      </div>

      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>

      <FormMessage state={state} />
    </form>
  );
}
