"use client";

import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { updateVariantAction } from "@/lib/admin/actions";
import type { VariantRow } from "@/lib/admin/queries";
import { TIER_LABEL } from "@/lib/booking/types";

/**
 * One price row, one form.
 *
 * Deliberately not a single "save everything" form for the whole catalogue: a
 * bulk save makes a typo in one field discard the other nineteen edits, and
 * makes the audit trail say "prices changed" instead of naming the row.
 */
export function VariantRowForm({ variant }: { variant: VariantRow }) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateVariantAction,
    IDLE,
  );

  const priceId = `price-${variant.id}`;
  const durationId = `duration-${variant.id}`;
  const activeId = `active-${variant.id}`;

  return (
    <form action={action} className="border-b border-line/60 py-3 last:border-b-0">
      <input type="hidden" name="id" value={variant.id} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        <div>
          <label className="admin-label" htmlFor={priceId}>
            {TIER_LABEL[variant.tier]} price (IDR)
          </label>
          <input
            id={priceId}
            name="priceIdr"
            type="text"
            inputMode="numeric"
            required
            defaultValue={String(variant.priceIdr)}
            className="admin-input"
          />
        </div>

        <div>
          <label className="admin-label" htmlFor={durationId}>
            Session length (minutes)
          </label>
          <input
            id={durationId}
            name="durationMinutes"
            type="number"
            min={5}
            max={600}
            step={5}
            required
            defaultValue={String(variant.durationMinutes)}
            className="admin-input"
          />
        </div>

        <div className="flex items-end">
          <label
            className="flex items-center gap-2 pb-2 text-[14px] font-bold text-ink"
            htmlFor={activeId}
          >
            <input
              id={activeId}
              name="active"
              type="checkbox"
              defaultChecked={variant.active}
              className="size-4"
            />
            Bookable
          </label>
        </div>

        <div className="flex items-end pb-1">
          <SubmitButton pendingLabel="Saving…" variant="quiet">
            Save
          </SubmitButton>
        </div>
      </div>

      <p className="mt-1 text-[12px] text-faint">
        {variant.bookingCount} booking
        {variant.bookingCount === 1 ? "" : "s"} taken at this row. Those keep the
        price they were quoted.
      </p>

      <FormMessage state={state} />
    </form>
  );
}
