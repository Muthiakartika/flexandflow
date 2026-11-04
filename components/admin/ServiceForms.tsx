"use client";

import { useActionState, useEffect, useRef } from "react";

import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  createServiceAction,
  createVariantAction,
  deleteServiceAction,
  updateServiceAction,
} from "@/lib/admin/actions";
import type { ServiceRow, TherapistOption } from "@/lib/admin/queries";
import { TIER_LABEL } from "@/lib/booking/types";

/** Clears a create form once it has worked, so the next entry starts empty. */
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

/** A new service. It starts with no price rows, so it sells nothing yet. */
export function NewServiceForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    createServiceAction,
    IDLE,
  );
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={action}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_auto_auto]">
        <div>
          <label className="admin-label" htmlFor="new-service-title">
            Name
          </label>
          <input
            id="new-service-title"
            name="title"
            required
            placeholder="e.g. Hot Stone Massage"
            className="admin-input"
          />
          <FieldError message={state.fields?.title} />
        </div>

        <div>
          <label className="admin-label" htmlFor="new-service-slug">
            Slug (optional)
          </label>
          <input
            id="new-service-slug"
            name="slug"
            placeholder="made from the name"
            className="admin-input"
          />
          <FieldError message={state.fields?.slug} />
        </div>

        <div>
          <label className="admin-label" htmlFor="new-service-buffer">
            Clean-down (min)
          </label>
          <input
            id="new-service-buffer"
            name="bufferMinutes"
            type="number"
            min={0}
            max={120}
            step={5}
            defaultValue="15"
            className="admin-input"
          />
          <FieldError message={state.fields?.bufferMinutes} />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2 text-[14px] font-bold text-ink">
            <input
              name="active"
              type="checkbox"
              defaultChecked
              className="size-4"
            />
            Listed
          </label>
        </div>

        <div className="flex items-end pb-1">
          <SubmitButton pendingLabel="Adding…">Add service</SubmitButton>
        </div>
      </div>

      <FormMessage state={state} />
    </form>
  );
}

/**
 * Name, clean-down, listed, and who performs it — plus delete.
 *
 * The therapist ticks are `ServiceOnTherapist`. A therapist only appears in
 * the wizard for this service if they are ticked here *and* the service has a
 * bookable price row at their tier.
 */
export function ServiceSettingsForm({
  service,
  therapists,
}: {
  service: ServiceRow;
  therapists: TherapistOption[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateServiceAction,
    IDLE,
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteServiceAction,
    IDLE,
  );

  const tiers = new Set(service.variants.map((variant) => variant.tier));

  return (
    <details className="mb-3 rounded-[8px] border border-line/60 px-3 py-2">
      <summary className="cursor-pointer text-[13px] font-bold text-ink">
        Service settings &amp; therapists
      </summary>

      <form action={action} className="pt-3">
        <input type="hidden" name="id" value={service.id} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]">
          <div>
            <label className="admin-label" htmlFor={`title-${service.id}`}>
              Name
            </label>
            <input
              id={`title-${service.id}`}
              name="title"
              required
              defaultValue={service.title}
              className="admin-input"
            />
            <FieldError message={state.fields?.title} />
          </div>

          <div>
            <label className="admin-label" htmlFor={`buffer-${service.id}`}>
              Clean-down (min)
            </label>
            <input
              id={`buffer-${service.id}`}
              name="bufferMinutes"
              type="number"
              min={0}
              max={120}
              step={5}
              required
              defaultValue={String(service.bufferMinutes)}
              className="admin-input"
            />
            <FieldError message={state.fields?.bufferMinutes} />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-[14px] font-bold text-ink">
              <input
                name="active"
                type="checkbox"
                defaultChecked={service.active}
                className="size-4"
              />
              Listed
            </label>
          </div>
        </div>

        <fieldset className="mt-3">
          <legend className="admin-label">Therapists who perform it</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {therapists.map((therapist) => (
              <label
                key={therapist.id}
                className="flex items-center gap-2 text-[14px] text-ink"
              >
                <input
                  name="therapistIds"
                  type="checkbox"
                  value={therapist.id}
                  defaultChecked={service.therapistIds.includes(therapist.id)}
                  className="size-4"
                />
                {therapist.displayName}
                {!therapist.active ? " (inactive)" : ""}
                {!tiers.has(therapist.tier) ? (
                  <span className="text-[12px] text-faint">
                    — no {TIER_LABEL[therapist.tier]} price yet
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-3 flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Saving…" variant="quiet">
            Save service
          </SubmitButton>
          <button
            type="submit"
            formAction={deleteAction}
            formNoValidate
            className="admin-btn admin-btn-danger"
            onClick={(event) => {
              if (
                !window.confirm(
                  `Delete ${service.title} and all its price rows? This cannot be undone.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            Delete service
          </button>
        </div>

        <FormMessage state={state} />
        <FormMessage state={deleteState} />
      </form>
    </details>
  );
}

/** A new price row: tier × length × price. */
export function NewVariantForm({ serviceId }: { serviceId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createVariantAction,
    IDLE,
  );
  const ref = useResetOnSuccess(state);

  const tierId = `new-tier-${serviceId}`;
  const priceId = `new-price-${serviceId}`;
  const durationId = `new-duration-${serviceId}`;

  return (
    <form
      ref={ref}
      action={action}
      className="mt-2 rounded-[8px] border border-dashed border-line px-3 py-3"
    >
      <input type="hidden" name="serviceId" value={serviceId} />

      <p className="mb-2 text-[13px] font-bold text-ink">Add a price row</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="admin-label" htmlFor={tierId}>
            Therapist tier
          </label>
          <select
            id={tierId}
            name="tier"
            defaultValue="STANDARD"
            className="admin-input"
          >
            <option value="STANDARD">{TIER_LABEL.STANDARD}</option>
            <option value="MASTER">{TIER_LABEL.MASTER}</option>
          </select>
        </div>

        <div>
          <label className="admin-label" htmlFor={priceId}>
            Price (IDR)
          </label>
          <input
            id={priceId}
            name="priceIdr"
            type="text"
            inputMode="numeric"
            required
            placeholder="500000"
            className="admin-input"
          />
          <FieldError message={state.fields?.priceIdr} />
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
            defaultValue="60"
            className="admin-input"
          />
          <FieldError message={state.fields?.durationMinutes} />
        </div>

        <div className="flex items-end pb-1">
          <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
        </div>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
