/**
 * Every conversion between "an instant" and "what the studio calls that time".
 *
 * The database stores UTC. Vercel runs in UTC. The studio is in Bali, which is
 * WITA — UTC+8, no daylight saving, ever. So a bare `new Date()` or
 * `date.getHours()` anywhere in the booking code is eight hours wrong and looks
 * right in local testing. Nothing outside this file may do that arithmetic.
 *
 * Safe to import from client components: no environment, no database. The
 * timezone is a constant here rather than `env().BOOKING_TIMEZONE` for exactly
 * that reason — the wizard renders slots in the browser.
 */
import { TZDate } from "@date-fns/tz";
import { addDays, addMinutes, startOfDay } from "date-fns";

/** WITA. Bali has never observed DST, so the offset is a flat +08:00. */
export const STUDIO_TZ = "Asia/Makassar";

export const MINUTES_PER_DAY = 24 * 60;

/** `2026-08-25` — the wire format for a studio-local calendar day. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  return ISO_DATE.test(value);
}

/** The same instant, read in studio time. */
export function toStudio(instant: Date): TZDate {
  return new TZDate(instant, STUDIO_TZ);
}

/** `2026-08-25` for the studio-local day an instant falls in. */
export function studioDateKey(instant: Date): IsoDate {
  const local = toStudio(instant);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The UTC instant of `HH:MM` on a studio-local calendar day.
 *
 * `minuteOfDay` may exceed 1440 — a slot that runs past midnight simply lands
 * on the next day, which is what the arithmetic should do.
 */
export function studioInstant(date: IsoDate, minuteOfDay: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  const local = new TZDate(year, month - 1, day, 0, 0, 0, 0, STUDIO_TZ);
  return new Date(local.getTime() + minuteOfDay * 60_000);
}

/** Midnight, studio time, as a UTC instant. */
export function studioDayStart(date: IsoDate): Date {
  return studioInstant(date, 0);
}

/** Midnight at the start of the following day. Exclusive upper bound. */
export function studioDayEnd(date: IsoDate): Date {
  return studioInstant(date, MINUTES_PER_DAY);
}

/** Minutes since studio-local midnight for an instant. */
export function minuteOfDay(instant: Date): number {
  const local = toStudio(instant);
  return local.getHours() * 60 + local.getMinutes();
}

/** 0 = Sunday … 6 = Saturday, in studio time. Matches `WorkingHour.weekday`. */
export function studioWeekday(dateOrInstant: IsoDate | Date): number {
  const instant =
    typeof dateOrInstant === "string"
      ? studioDayStart(dateOrInstant)
      : dateOrInstant;
  return toStudio(instant).getDay();
}

/** `540` → `"09:00"`. Handles values past midnight by wrapping. */
export function formatMinuteOfDay(minutes: number): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const mins = String(wrapped % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

/** `540` → `"9:00 am"`, the form the old booking flow used. */
export function formatMinuteOfDay12h(minutes: number): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours24 = Math.floor(wrapped / 60);
  const mins = String(wrapped % 60).padStart(2, "0");
  const suffix = hours24 < 12 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins} ${suffix}`;
}

/** `"09:00"` → `540`. Returns null for anything that is not `HH:MM`. */
export function parseMinuteOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SHORT_DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: STUDIO_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Tuesday 25 August 2026", studio time. */
export function formatStudioDate(instant: Date): string {
  return DAY_LABEL.format(instant);
}

/** "Tue 25 Aug", studio time. */
export function formatStudioDateShort(instant: Date): string {
  return SHORT_DAY_LABEL.format(instant);
}

/** "9:00 AM", studio time. */
export function formatStudioTime(instant: Date): string {
  return TIME_LABEL.format(instant);
}

/** "Tuesday 25 August 2026, 9:00 AM – 10:30 AM (WITA)". */
export function formatStudioRange(start: Date, end: Date): string {
  return `${formatStudioDate(start)}, ${formatStudioTime(start)} – ${formatStudioTime(end)} (WITA)`;
}

/** Half-open overlap: touching ends do not collide. */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** `2026-08` → every `IsoDate` in that studio-local month. */
export function studioMonthDays(month: string): IsoDate[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const days: IsoDate[] = [];
  const cursor = new Date(Date.UTC(year, monthNumber - 1, 1));

  while (cursor.getUTCMonth() === monthNumber - 1) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/** `2026-08` for a studio-local instant. */
export function studioMonthKey(instant: Date): string {
  return studioDateKey(instant).slice(0, 7);
}

/** Adds calendar days to an `IsoDate` without going through UTC arithmetic. */
export function addStudioDays(date: IsoDate, days: number): IsoDate {
  return studioDateKey(addDays(studioDayStart(date), days));
}

export { addMinutes, startOfDay };
