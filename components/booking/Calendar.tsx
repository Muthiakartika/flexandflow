"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { FOCUS } from "@/components/ui/tokens";
import {
  STUDIO_TZ,
  addStudioDays,
  studioDateKey,
  studioMonthDays,
  studioMonthKey,
  studioWeekday,
  type IsoDate,
} from "@/lib/booking/time";
import type { DayAvailability, MonthAvailability } from "@/lib/booking/types";

/** Monday first, as the previous booking calendar had it. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Six rows always, so paging between months does not resize the panel. */
const CELLS = 42;

type DayState = "available" | "full" | "closed" | "out" | "other";

type Cell = {
  date: IsoDate;
  /** Day-of-month number, as shown. */
  label: number;
  /** False for the leading and trailing days of the neighbouring months. */
  inMonth: boolean;
  state: DayState;
  slotCount: number;
};

/** `2026-08` ± n months, without going anywhere near a `Date`. */
function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const total = year * 12 + (index - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = String((total % 12) + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

/**
 * "August 2026", studio time.
 *
 * Built at noon UTC so the instant lands in the middle of the studio's day
 * whichever way the +8 offset pushes it — midnight UTC on the 1st is already
 * 08:00 on the 1st in Bali, but noon leaves no room to wonder.
 */
function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDIO_TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, index - 1, 1, 12)));
}

function stateOf(day: DayAvailability | undefined): DayState {
  if (!day) return "out";
  if (day.closed) return "closed";
  if (day.outOfRange) return "out";
  if (day.full || day.slotCount === 0) return "full";
  return "available";
}

/** State, label, and whether to draw the today dot. Order matches the grid's. */
const LEGEND: [DayState, string, boolean][] = [
  ["available", "Available", false],
  ["full", "Fully booked", false],
  ["closed", "Closed", false],
  ["available", "Today", true],
];

const DESCRIPTION: Record<DayState, string> = {
  available: "available",
  full: "fully booked",
  closed: "studio closed",
  out: "not bookable",
  other: "not bookable",
};

/**
 * The month grid.
 *
 * Days the studio cannot take are not hidden — a day that is closed, full or
 * beyond the booking window still shows its number, and reads differently from
 * one that is free. A calendar that simply omits them looks broken rather than
 * busy.
 *
 * The window itself is not recomputed here. The availability endpoint already
 * knows the lead time and `BOOKING_MAX_ADVANCE_DAYS` and flags every day it
 * returns, so the arrows read those flags rather than keeping a second copy of
 * the rule that could drift from the server's.
 */
export default function Calendar({
  month,
  availability,
  selected,
  loading,
  error,
  onMonth,
  onSelect,
}: {
  month: string;
  availability: MonthAvailability | null;
  selected: IsoDate | null;
  loading: boolean;
  error: string | null;
  onMonth: (month: string) => void;
  onSelect: (date: IsoDate) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  /* Set only by the arrow keys. Everything else about the roving tab stop is
     derived below, so paging to a new month cannot leave it on a day that is
     no longer drawn. */
  const [arrowed, setArrowed] = useState<IsoDate | null>(null);

  const today = studioDateKey(new Date());
  const thisMonth = studioMonthKey(new Date());

  const byDate = useMemo(() => {
    const map = new Map<IsoDate, DayAvailability>();
    for (const day of availability?.days ?? []) map.set(day.date, day);
    return map;
  }, [availability]);

  const cells = useMemo<Cell[]>(() => {
    const days = studioMonthDays(month);
    const first = days[0];
    /* `studioWeekday` is 0 = Sunday; the grid starts on Monday. */
    const lead = (studioWeekday(first) + 6) % 7;

    return Array.from({ length: CELLS }, (_, index) => {
      const offset = index - lead;
      const date =
        offset >= 0 && offset < days.length
          ? days[offset]
          : addStudioDays(first, offset);
      const inMonth = offset >= 0 && offset < days.length;
      const day = byDate.get(date);

      return {
        date,
        label: Number(date.slice(8)),
        inMonth,
        state: inMonth ? stateOf(day) : "other",
        slotCount: day?.slotCount ?? 0,
      };
    });
  }, [month, byDate]);

  const selectable = useMemo(
    () => cells.filter((cell) => cell.state === "available"),
    [cells],
  );

  /* The single tab stop: wherever the arrows last went, else the chosen day,
     else the first day that can actually be picked. */
  const focusDate = useMemo<IsoDate | null>(() => {
    const drawn = (date: IsoDate | null) =>
      date !== null && cells.some((cell) => cell.date === date);

    if (drawn(arrowed)) return arrowed;
    if (drawn(selected)) return selected;
    return selectable[0]?.date ?? null;
  }, [cells, selectable, arrowed, selected]);

  const canGoBack = month > thisMonth;
  /* If the last day of the month the server described is already past the
     booking window, everything after it is too. */
  const lastDay = availability?.days.at(-1);
  const canGoForward = !lastDay || !lastDay.outOfRange;

  function move(step: number) {
    if (!focusDate) return;
    const index = cells.findIndex((cell) => cell.date === focusDate);
    if (index < 0) return;

    for (let next = index + step; next >= 0 && next < CELLS; next += step) {
      if (cells[next].state !== "available") continue;

      setArrowed(cells[next].date);
      /* Every cell is already in the DOM, so focus can move now rather than
         waiting a render for the tab stop to catch up. */
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${cells[next].date}"]`)
        ?.focus();
      return;
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    move(step);
  }

  function changeMonth(delta: number) {
    setArrowed(null);
    onMonth(shiftMonth(month, delta));
  }

  return (
    <div className="booking-calendar">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={!canGoBack}
          className={`booking-month-arrow ${FOCUS}`}
        >
          <span aria-hidden>←</span>
          <span className="sr-only">Previous month</span>
        </button>

        <h3 className="font-display text-[24px] leading-none font-bold">
          {monthLabel(month)}
        </h3>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={!canGoForward}
          className={`booking-month-arrow ${FOCUS}`}
        >
          <span aria-hidden>→</span>
          <span className="sr-only">Next month</span>
        </button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`${monthLabel(month)} availability`}
        onKeyDown={onKeyDown}
        className="mt-4"
      >
        <div role="row" className="booking-week">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              role="columnheader"
              aria-label={day}
              className="booking-weekday"
            >
              {day.slice(0, 2)}
            </span>
          ))}
        </div>

        {Array.from({ length: CELLS / 7 }, (_, row) => (
          <div role="row" key={row} className="booking-week">
            {cells.slice(row * 7, row * 7 + 7).map((cell) => {
              const isSelected = cell.date === selected;
              return (
                <div role="gridcell" key={cell.date}>
                  <button
                    type="button"
                    data-date={cell.date}
                    data-state={cell.state}
                    data-today={cell.date === today ? "true" : "false"}
                    data-selected={isSelected ? "true" : "false"}
                    disabled={cell.state !== "available"}
                    tabIndex={cell.date === focusDate ? 0 : -1}
                    aria-pressed={isSelected}
                    aria-label={
                      cell.state === "available"
                        ? `${cell.label} ${monthLabel(month)} — ${cell.slotCount} times available`
                        : `${cell.label} ${monthLabel(month)} — ${DESCRIPTION[cell.state]}`
                    }
                    onClick={() => onSelect(cell.date)}
                    className={`booking-day ${FOCUS}`}
                  >
                    <span aria-hidden>{cell.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p
        aria-live="polite"
        className="mt-3 font-body text-[13px] leading-[1.6] text-body-text/65"
      >
        {error
          ? error
          : loading
            ? "Checking availability…"
            : selectable.length === 0
              ? "No days open this month — try the next one."
              : ""}
      </p>

      {/*
        The key demonstrates each mark by wearing it: "Fully booked" is struck
        through because that is what a booked day looks like, "Closed" is faded
        because that is what a closed one looks like. A sample numeral was tried
        and read as a quantity — "8 Available" looks like a count, not a swatch.
      */}
      <ul className="booking-legend">
        {LEGEND.map(([state, label, today]) => (
          <li key={label} data-state={state} data-today={today ? "true" : "false"}>
            {label}
          </li>
        ))}
      </ul>

    </div>
  );
}
