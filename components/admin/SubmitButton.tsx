"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/admin/action-state";

/**
 * A real `<button type="submit">` that disables itself while its form is in
 * flight. `useFormStatus` reads the status of the enclosing form, so this has
 * to be a child of it rather than the component holding the state.
 *
 * Double-submitting matters here more than usual: two clicks on "Cancel" would
 * send the customer two cancellation messages, and two on "Move" would fight
 * over the same slot.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "solid" | "quiet" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`admin-btn admin-btn-${variant} ${className}`}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

/**
 * The one line a form says back. `role="status"` so a screen reader announces
 * it without the admin having to go looking for what happened.
 */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;

  return (
    <p
      role="status"
      className={`mt-2 rounded-[8px] px-3 py-2 text-[13px] font-bold ${
        state.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
      }`}
    >
      {state.message}
    </p>
  );
}
