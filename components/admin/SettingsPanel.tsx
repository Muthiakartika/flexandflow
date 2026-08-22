"use client";

import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  dispatchPendingAction,
  sendTestMessageAction,
} from "@/lib/admin/actions";

/**
 * The two buttons that answer "is it working now?".
 *
 * A test message proves the whole path — credentials, session, template,
 * number formatting — in a way that reading a status field cannot. Running the
 * queue by hand proves the backlog drains, without waiting for the cron.
 */
export function SettingsPanel({ pending }: { pending: number }) {
  const [testState, testAction] = useActionState<ActionState, FormData>(
    sendTestMessageAction,
    IDLE,
  );
  const [dispatchState, dispatchAction] = useActionState<ActionState, FormData>(
    dispatchPendingAction,
    IDLE,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={testAction} className="admin-card p-4">
        <h2 className="mb-1 text-[15px] font-bold text-ink">
          Send a test message
        </h2>
        <p className="mb-3 text-[13px] text-muted">
          Fill in either field, or both. This sends a real message to a real
          address — use your own.
        </p>

        <div className="mb-3">
          <label className="admin-label" htmlFor="test-email">
            Email address
          </label>
          <input
            id="test-email"
            name="email"
            type="email"
            autoComplete="off"
            className="admin-input"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-3">
          <label className="admin-label" htmlFor="test-phone">
            WhatsApp number (E.164)
          </label>
          <input
            id="test-phone"
            name="phoneE164"
            type="tel"
            autoComplete="off"
            className="admin-input"
            placeholder="+6285858887777"
          />
          <p className="mt-1 text-[12px] text-faint">
            Include the country code and the plus sign. A number with no
            WhatsApp account is reported rather than retried.
          </p>
        </div>

        <SubmitButton pendingLabel="Sending…">Send test</SubmitButton>
        <FormMessage state={testState} />
      </form>

      <form action={dispatchAction} className="admin-card p-4">
        <h2 className="mb-1 text-[15px] font-bold text-ink">Run the queue</h2>
        <p className="mb-3 text-[13px] text-muted">
          The cron does this on its own every few minutes. Press it when
          something has just been fixed and you want to know now.{" "}
          {pending === 0
            ? "Nothing is waiting."
            : `${pending} message${pending === 1 ? "" : "s"} waiting.`}
        </p>

        <SubmitButton pendingLabel="Running…" variant="quiet">
          Send pending messages
        </SubmitButton>
        <FormMessage state={dispatchState} />
      </form>
    </div>
  );
}
