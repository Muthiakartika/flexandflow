"use client";

import { useActionState } from "react";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  addTimeOffAction,
  deleteTimeOffAction,
} from "@/lib/admin/actions";
import type { TherapistSchedule, TimeOffWithConflicts } from "@/lib/admin/queries";
import {
  formatIdr,
  formatPhoneDisplay,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import {
  formatStudioDate,
  formatStudioTime,
  studioDateKey,
} from "@/lib/booking/time";

export function TimeOffEditor({
  therapists,
  entries,
  today,
}: {
  therapists: TherapistSchedule[];
  entries: TimeOffWithConflicts[];
  /** Studio-local today, computed on the server — the browser's clock is not WITA. */
  today: string;
}) {
  const [addState, addAction] = useActionState<ActionState, FormData>(
    addTimeOffAction,
    IDLE,
  );
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    deleteTimeOffAction,
    IDLE,
  );

  return (
    <>
      <form action={addAction} className="admin-card p-4">
        <h3 className="mb-1 text-[15px] font-bold text-ink">Add time off</h3>
        <p className="mb-3 text-[13px] text-muted">
          Leave the therapist blank to close the studio for everyone — a public
          holiday. Leave the times blank for a whole day. Nothing here cancels a
          booking; anything already in the diary is listed below so you know who
          to ring.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <label className="admin-label" htmlFor="off-therapist">
              Therapist
            </label>
            <AdminSelect
              id="off-therapist"
              name="therapistId"
              defaultValue=""
              options={[
                { value: "", label: "Whole studio closed" },
                ...therapists.map((therapist) => ({
                  value: therapist.id,
                  label: therapist.name,
                })),
              ]}
            />
          </div>

          <div>
            <label className="admin-label" htmlFor="off-from-date">
              From date
            </label>
            <input
              id="off-from-date"
              name="fromDate"
              type="date"
              required
              defaultValue={today}
              className="admin-input"
            />
            <FieldError message={addState.fields?.fromDate} />
          </div>

          <div>
            <label className="admin-label" htmlFor="off-from-time">
              From time (HH:MM)
            </label>
            <input
              id="off-from-time"
              name="fromTime"
              type="time"
              defaultValue="00:00"
              className="admin-input"
            />
            <FieldError message={addState.fields?.startAt} />
          </div>

          <div className="hidden lg:block" aria-hidden="true" />

          <div>
            <label className="admin-label" htmlFor="off-to-date">
              To date
            </label>
            <input
              id="off-to-date"
              name="toDate"
              type="date"
              required
              defaultValue={today}
              className="admin-input"
            />
            <FieldError message={addState.fields?.toDate} />
          </div>

          <div>
            <label className="admin-label" htmlFor="off-to-time">
              To time (HH:MM)
            </label>
            <input
              id="off-to-time"
              name="toTime"
              type="time"
              className="admin-input"
              placeholder="Blank = end of day"
            />
            <FieldError message={addState.fields?.endAt} />
          </div>

          <div>
            <label className="admin-label" htmlFor="off-reason">
              Reason
            </label>
            <input
              id="off-reason"
              name="reason"
              type="text"
              maxLength={200}
              className="admin-input"
              placeholder="Nyepi, sick leave, training…"
            />
            <FieldError message={addState.fields?.reason} />
          </div>
        </div>

        <div className="mt-3">
          <SubmitButton pendingLabel="Saving…">Add time off</SubmitButton>
        </div>

        <FormMessage state={addState} />
      </form>

      <FormMessage state={removeState} />

      <div className="mt-4 grid gap-3">
        {entries.length === 0 ? (
          <p className="admin-card px-4 py-6 text-center text-[14px] text-faint">
            No time off on the books from today onwards.
          </p>
        ) : (
          entries.map((entry) => (
            <section key={entry.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">
                    {entry.therapistName ?? "Whole studio"}
                  </p>
                  <p className="text-[13px] text-muted">
                    {formatStudioDate(entry.startAt)},{" "}
                    {formatStudioTime(entry.startAt)} →{" "}
                    {formatStudioDate(entry.endAt)},{" "}
                    {formatStudioTime(entry.endAt)}
                  </p>
                  {entry.reason ? (
                    <p className="text-[13px] text-faint">{entry.reason}</p>
                  ) : null}
                </div>

                <form action={removeAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <SubmitButton variant="danger" pendingLabel="Removing…">
                    Remove
                  </SubmitButton>
                </form>
              </div>

              {entry.conflicts.length > 0 ? (
                <div className="mt-3 rounded-[8px] border border-warn/40 bg-warn-soft p-3">
                  <p className="text-[13px] font-bold text-warn">
                    {entry.conflicts.length} booking
                    {entry.conflicts.length === 1 ? "" : "s"} still stand inside
                    this block. They have not been cancelled — ring them.
                  </p>
                  <ul className="mt-2 grid gap-1">
                    {entry.conflicts.map((booking) => (
                      <li key={booking.id} className="text-[13px] text-ink">
                        <span className="font-bold">
                          {formatStudioTime(new Date(booking.startAt))}
                        </span>{" "}
                        {studioDateKey(new Date(booking.startAt))} ·{" "}
                        {booking.serviceTitle} · {booking.therapistName} ·{" "}
                        {fullName(
                          booking.customer.firstName,
                          booking.customer.lastName,
                        )}{" "}
                        <a
                          href={whatsappLink(booking.customer.phoneE164)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-olive-strong underline underline-offset-2"
                        >
                          {formatPhoneDisplay(booking.customer.phoneE164)}
                        </a>{" "}
                        · {formatIdr(booking.priceIdr)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))
        )}
      </div>
    </>
  );
}
