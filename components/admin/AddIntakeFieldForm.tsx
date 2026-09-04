"use client";

import { useActionState, useState } from "react";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import type { IntakeFieldKind, IntakeSectionKey } from "@/generated/prisma/enums";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { addIntakeFieldAction } from "@/lib/intake/actions";
import { OPTION_KINDS } from "@/lib/intake/schema";

const KIND_LABEL: Record<IntakeFieldKind, string> = {
  TEXT: "Text (one line)",
  TEXTAREA: "Text area (multiple lines)",
  PHONE: "Phone number",
  DATE: "Date",
  DROPDOWN: "Dropdown",
  RADIO: "Radio buttons",
  YES_NO: "Yes / No",
  CHECKBOX_GROUP: "Checkbox group (select multiple)",
  IMAGE: "Image upload",
  SIGNATURE: "Signature",
  NAME: "Name (first + last)",
  ADDRESS: "Address",
  INFO: "Notice text (not a question)",
};

/** Same list `intakeFieldCreateSchema` accepts, in a sensible reading order —
 *  ADDRESS is left out entirely, matching the schema (nothing seeds it any
 *  more, and this editor has no way to configure a five-part compound). */
const CREATABLE_KIND_ORDER: IntakeFieldKind[] = [
  "TEXT",
  "TEXTAREA",
  "PHONE",
  "DATE",
  "DROPDOWN",
  "RADIO",
  "YES_NO",
  "CHECKBOX_GROUP",
  "IMAGE",
  "SIGNATURE",
  "NAME",
  "INFO",
];

export function AddIntakeFieldForm({
  sections,
  hasSignature,
}: {
  sections: readonly { key: IntakeSectionKey; label: string }[];
  /** Hides "Signature" from the kind picker once one exists — the action
   *  refuses a second one regardless, this just keeps the form from
   *  offering a choice that would fail. */
  hasSignature: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addIntakeFieldAction,
    IDLE,
  );
  const [kind, setKind] = useState<IntakeFieldKind>("TEXT");

  const kindOptions = CREATABLE_KIND_ORDER.filter(
    (kind) => kind !== "SIGNATURE" || !hasSignature,
  ).map((kind) => ({ value: kind, label: KIND_LABEL[kind] }));

  const sectionOptions = sections.map((section) => ({
    value: section.key,
    label: section.label,
  }));

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="admin-label" htmlFor="new-field-section">
            Section
          </label>
          <AdminSelect
            id="new-field-section"
            name="sectionKey"
            options={sectionOptions}
            defaultValue={sections[0]?.key}
            ariaLabel="Section"
          />
        </div>

        <div>
          <label className="admin-label" htmlFor="new-field-kind">
            Field type
          </label>
          <AdminSelect
            id="new-field-kind"
            name="kind"
            options={kindOptions}
            value={kind}
            onValueChange={(value) => setKind(value as IntakeFieldKind)}
            ariaLabel="Field type"
          />
        </div>
      </div>

      <div>
        <label className="admin-label" htmlFor="new-field-label">
          Label
        </label>
        <input
          id="new-field-label"
          name="label"
          type="text"
          required
          placeholder="e.g. How did you hear about us?"
          className="admin-input"
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="new-field-help">
          Help text (optional)
        </label>
        <textarea id="new-field-help" name="helpText" rows={2} className="admin-input" />
      </div>

      {OPTION_KINDS.has(kind) ? <div>
        <label className="admin-label" htmlFor="new-field-options">
          Options — one per line (Dropdown, Radio and Checkbox group only)
        </label>
        <textarea
          id="new-field-options"
          name="options"
          rows={3}
          placeholder={"Option one\nOption two\nOption three"}
          className="admin-input"
          required
        />
      </div> : null}

      {kind !== "INFO" && kind !== "SIGNATURE" ? <label
        className="flex items-center gap-2 text-[14px] font-bold text-ink"
        htmlFor="new-field-required"
      >
        <input id="new-field-required" name="required" type="checkbox" className="size-4" />
        Required
      </label> : null}

      <div>
        <SubmitButton pendingLabel="Adding…">Add field</SubmitButton>
      </div>

      <FormMessage state={state} />
      {state.fields ? <p role="alert" className="text-[13px] text-danger">{Object.values(state.fields).join(" ")}</p> : null}
    </form>
  );
}
