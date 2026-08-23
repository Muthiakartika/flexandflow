"use client";

import { useActionState } from "react";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  addWorkingHourAction,
  deleteWorkingHourAction,
} from "@/lib/admin/actions";
import type { TherapistSchedule } from "@/lib/admin/queries";
import { formatMinuteOfDay } from "@/lib/booking/time";

/** `WorkingHour.weekday` is 0 = Sunday, matching `Date#getDay` in studio time. */
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function ScheduleEditor({
  therapists,
}: {
  therapists: TherapistSchedule[];
}) {
  const [addState, addAction] = useActionState<ActionState, FormData>(
    addWorkingHourAction,
    IDLE,
  );
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    deleteWorkingHourAction,
    IDLE,
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {therapists.map((therapist) => (
          <section key={therapist.id} className="admin-card p-4">
            <h3 className="text-[15px] font-bold text-ink">
              {therapist.name}
              {therapist.active ? null : (
                <span className="ml-2 admin-chip bg-cream text-muted">
                  inactive
                </span>
              )}
            </h3>

            <dl className="mt-2">
              {WEEKDAYS.map((label, weekday) => {
                const blocks = therapist.workingHours.filter(
                  (hour) => hour.weekday === weekday,
                );

                return (
                  <div
                    key={label}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/60 py-2 last:border-b-0"
                  >
                    <dt className="w-[92px] shrink-0 text-[12px] font-bold tracking-[0.04em] text-faint uppercase">
                      {label}
                    </dt>
                    <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {blocks.length === 0 ? (
                        <span className="text-[13px] text-faint">Closed</span>
                      ) : (
                        blocks.map((block) => (
                          <span
                            key={block.id}
                            className="inline-flex items-center gap-2 rounded-[8px] border border-line bg-cream px-2 py-1 text-[13px]"
                          >
                            {formatMinuteOfDay(block.startMinute)}–
                            {formatMinuteOfDay(block.endMinute)}
                            <form action={removeAction}>
                              <input
                                type="hidden"
                                name="id"
                                value={block.id}
                              />
                              <SubmitButton
                                variant="danger"
                                pendingLabel="…"
                                className="px-2 py-0 text-[12px]"
                              >
                                <span className="sr-only">
                                  Remove {label}{" "}
                                  {formatMinuteOfDay(block.startMinute)} to{" "}
                                  {formatMinuteOfDay(block.endMinute)} for{" "}
                                  {therapist.name}
                                </span>
                                <span aria-hidden="true">×</span>
                              </SubmitButton>
                            </form>
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      <FormMessage state={removeState} />

      <form action={addAction} className="admin-card mt-4 p-4">
        <h3 className="mb-1 text-[15px] font-bold text-ink">
          Add a block of working hours
        </h3>
        <p className="mb-3 text-[13px] text-muted">
          More than one block a day is normal and is how the midday break
          exists: 09:00–12:00 and 14:00–17:00 leave a gap no session can
          straddle. Times are Bali time.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="admin-label" htmlFor="hours-therapist">
              Therapist
            </label>
            {/* Seeded with the first therapist because a native `<select>`
                selected one for us and the action still requires one. */}
            <AdminSelect
              id="hours-therapist"
              name="therapistId"
              defaultValue={therapists[0]?.id ?? ""}
              options={therapists.map((therapist) => ({
                value: therapist.id,
                label: therapist.name,
              }))}
            />
            <FieldError message={addState.fields?.therapistId} />
          </div>

          <div>
            <label className="admin-label" htmlFor="hours-weekday">
              Day
            </label>
            <AdminSelect
              id="hours-weekday"
              name="weekday"
              defaultValue="1"
              options={WEEKDAYS.map((label, weekday) => ({
                value: String(weekday),
                label,
              }))}
            />
            <FieldError message={addState.fields?.weekday} />
          </div>

          <div>
            <label className="admin-label" htmlFor="hours-start">
              Starts (HH:MM)
            </label>
            <input
              id="hours-start"
              name="start"
              type="time"
              required
              defaultValue="09:00"
              className="admin-input"
            />
            <FieldError
              message={addState.fields?.start ?? addState.fields?.startMinute}
            />
          </div>

          <div>
            <label className="admin-label" htmlFor="hours-end">
              Ends (HH:MM)
            </label>
            <input
              id="hours-end"
              name="end"
              type="time"
              required
              defaultValue="12:00"
              className="admin-input"
            />
            <FieldError
              message={addState.fields?.end ?? addState.fields?.endMinute}
            />
          </div>
        </div>

        <div className="mt-3">
          <SubmitButton pendingLabel="Adding…">Add hours</SubmitButton>
        </div>

        <FormMessage state={addState} />
      </form>
    </>
  );
}
