"use client";

import { CARD, FOCUS, FOCUS_ON_OLIVE } from "@/components/ui/tokens";
import { formatMinuteOfDay12h, type IsoDate } from "@/lib/booking/time";
import {
  DAY_PART_LABEL,
  type MonthAvailability,
  type Slot,
  type SlotGroup,
} from "@/lib/booking/types";

import Calendar from "./Calendar";

/**
 * Step 3 — the day, then the time.
 *
 * Slots with nothing left are rendered disabled rather than dropped, which is
 * what the previous system did: a Saturday whose morning is gone but whose
 * evening is open reads as a busy day, not a closed one, and removing the taken
 * rows makes the studio look shut.
 *
 * The timezone is stated once, plainly. Every label on this screen is studio
 * time, and somebody booking from London has no way to know that otherwise.
 */
export default function DateTimeStep({
  month,
  availability,
  availabilityLoading,
  availabilityError,
  date,
  groups,
  slotsLoading,
  slotsError,
  slot,
  onMonth,
  onDate,
  onSlot,
}: {
  month: string;
  availability: MonthAvailability | null;
  availabilityLoading: boolean;
  availabilityError: string | null;
  date: IsoDate | null;
  groups: SlotGroup[] | null;
  slotsLoading: boolean;
  slotsError: string | null;
  slot: Slot | null;
  onMonth: (month: string) => void;
  onDate: (date: IsoDate) => void;
  onSlot: (slot: Slot) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="page-label">All times WITA / UTC+8</p>

      <div className={`booking-split ${CARD} p-[clamp(1rem,2.5vw,1.5rem)]`}>
        <Calendar
          month={month}
          availability={availability}
          selected={date}
          loading={availabilityLoading}
          error={availabilityError}
          onMonth={onMonth}
          onSelect={onDate}
        />

        <div className="booking-slots">
          <Slots
            date={date}
            groups={groups}
            loading={slotsLoading}
            error={slotsError}
            slot={slot}
            onSlot={onSlot}
          />
        </div>
      </div>
    </div>
  );
}

function Slots({
  date,
  groups,
  loading,
  error,
  slot,
  onSlot,
}: {
  date: IsoDate | null;
  groups: SlotGroup[] | null;
  loading: boolean;
  error: string | null;
  slot: Slot | null;
  onSlot: (slot: Slot) => void;
}) {
  if (!date) {
    return (
      <p className="font-body text-[15px] leading-[1.7] text-body-text/70">
        Choose a day to see the times we have open.
      </p>
    );
  }

  if (error) {
    return (
      <p className="font-body text-[15px] leading-[1.7] text-body-text/75">
        {error}
      </p>
    );
  }

  if (loading || !groups) {
    return (
      <p className="font-body text-[15px] text-body-text/60">Loading times…</p>
    );
  }

  const populated = groups.filter((group) => group.slots.length > 0);

  if (populated.length === 0) {
    return (
      <p className="font-body text-[15px] leading-[1.7] text-body-text/70">
        Nothing open on this day. Try another one.
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="Time" className="flex flex-col gap-6">
      {populated.map((group) => (
        <section key={group.dayPart}>
          <h3 className="page-label mb-3">{DAY_PART_LABEL[group.dayPart]}</h3>

          <div className="booking-slot-grid">
            {group.slots.map((option) => {
              const taken = option.slotsLeft === 0;
              const selected = !taken && option.startAt === slot?.startAt;

              return (
                <button
                  key={option.startAt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={taken}
                  onClick={() => onSlot(option)}
                  data-selected={selected ? "true" : "false"}
                  className={`booking-slot ${selected ? FOCUS_ON_OLIVE : FOCUS}`}
                >
                  <span className="font-body text-[14px] leading-none tabular-nums">
                    {formatMinuteOfDay12h(option.startMinute)} –{" "}
                    {formatMinuteOfDay12h(option.endMinute)}
                  </span>
                  <span className="booking-slot-left font-body text-[12px] leading-none">
                    {/* The previous booking system printed "1 Slots left". It is
                        the one thing here not worth reproducing faithfully. */}
                    {option.slotsLeft}{" "}
                    {option.slotsLeft === 1 ? "slot" : "slots"} left
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
