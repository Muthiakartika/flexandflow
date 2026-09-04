"use client";

import { useActionState } from "react";

import { DeleteIntakeFieldButton } from "@/components/admin/DeleteIntakeFieldButton";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import type { IntakeFormField } from "@/generated/prisma/client";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { updateIntakeFieldAction } from "@/lib/intake/actions";
import { OPTION_KINDS } from "@/lib/intake/schema";

/**
 * One field, one form — the same reasoning `VariantRowForm` gives: a typo in
 * one field must not discard the other thirty-three edits, and the audit
 * trail should name the row rather than say "fields changed".
 */
export function IntakeFieldRowForm({ field }: { field: IntakeFormField }) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateIntakeFieldAction,
    IDLE,
  );

  const labelId = `intake-label-${field.id}`;
  const helpId = `intake-help-${field.id}`;
  const requiredId = `intake-required-${field.id}`;
  const optionsId = `intake-options-${field.id}`;

  return (
    <div className="border-b border-line/60 py-4 last:border-b-0">
      <form action={action}>
        <input type="hidden" name="id" value={field.id} />

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="min-w-0 break-all font-mono text-[12px] text-faint">{field.fieldKey}</p>
          <div className="flex items-center gap-1.5">
            {field.isCustom ? (
              <span className="admin-chip bg-ok-soft text-ok">custom</span>
            ) : null}
            <span className="admin-chip bg-cream text-muted">
              {field.kind.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <div className="mt-2 grid gap-3">
          <div>
            <label className="admin-label" htmlFor={labelId}>
              Label
            </label>
            <input
              id={labelId}
              name="label"
              type="text"
              required
              defaultValue={field.label}
              className="admin-input"
            />
          </div>

          <div>
            <label className="admin-label" htmlFor={helpId}>
              {field.kind === "INFO" ? "Notice text" : "Help text"}
            </label>
            <textarea
              id={helpId}
              name="helpText"
              rows={field.kind === "INFO" ? 5 : 2}
              defaultValue={field.helpText ?? ""}
              className="admin-input"
            />
          </div>

          {OPTION_KINDS.has(field.kind) ? (
            <div>
              <label className="admin-label" htmlFor={optionsId}>
                Options (one per line)
              </label>
              <textarea
                id={optionsId}
                name="options"
                rows={Math.max(3, field.options.length)}
                defaultValue={field.options.join("\n")}
                className="admin-input"
              />
              <p className="mt-1 text-[12px] text-faint">
                One unique option per line. This order is used on the public form.
              </p>
            </div>
          ) : null}

          {field.kind === "SIGNATURE" ? (
            <p className="text-[12px] text-faint">
              Required while this signature field is on the form.
            </p>
          ) : field.kind !== "INFO" ? (
            <label
              className="flex items-center gap-2 text-[14px] font-bold text-ink"
              htmlFor={requiredId}
            >
              <input
                id={requiredId}
                name="required"
                type="checkbox"
                defaultChecked={field.required}
                className="size-4"
              />
              Required
            </label>
          ) : null}
        </div>

        <div className="mt-3">
          <SubmitButton pendingLabel="Saving…" variant="quiet">
            Save
          </SubmitButton>
        </div>

        <FormMessage state={state} />
        {state.fields ? <p role="alert" className="text-[13px] text-danger">{Object.values(state.fields).join(" ")}</p> : null}
      </form>

      {(
        <div className="mt-3 border-t border-line/40 pt-3">
          <DeleteIntakeFieldButton fieldId={field.id} label={field.label} />
        </div>
      )}
    </div>
  );
}
