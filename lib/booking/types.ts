/**
 * The wire contract between the booking API, the wizard, and the admin panel.
 *
 * These are the shapes that cross a network boundary, so they are plain JSON —
 * no `Date`, no Prisma models, no Decimal. Instants travel as ISO strings and
 * are rendered through `lib/booking/time.ts` on whichever side needs them.
 *
 * Safe to import from client components.
 */
import type { IsoDate } from "@/lib/booking/time";

export type Tier = "MASTER" | "STANDARD";

export type BookingStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

/** The sentinel the staff step uses for "Any Staff". Never a real therapist id. */
export const ANY_STAFF = "any" as const;

export type StaffSelection = string | typeof ANY_STAFF;

export type StaffOption = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  tier: Tier;
  photo: string | null;
  email: string | null;
};

export type CategoryOption = {
  id: string;
  slug: string;
  name: string;
};

/** One bookable line in the service step: a service at a duration and a price. */
export type VariantOption = {
  id: string;
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  serviceImage: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  tier: Tier;
  durationMinutes: number;
  bufferMinutes: number;
  priceIdr: number;
  /**
   * Which therapists can actually deliver this variant. With "Any Staff" the
   * wizard shows the cheapest variant per service and resolves the therapist
   * at the slot step, so it needs to know who is eligible.
   */
  therapistIds: string[];
};

export type ServiceCatalogue = {
  categories: CategoryOption[];
  variants: VariantOption[];
};

/** Which part of the day a slot falls in. Mirrors the previous booking UI. */
export type DayPart = "morning" | "afternoon" | "evening";

export type Slot = {
  /** UTC ISO instant the session starts. */
  startAt: string;
  /** UTC ISO instant the room frees up, buffer included. */
  endAt: string;
  /** Minutes since studio-local midnight — what the label is rendered from. */
  startMinute: number;
  endMinute: number;
  dayPart: DayPart;
  /**
   * How many therapists are free at this time. Always 1 when a specific
   * therapist was chosen. Slots with 0 are still returned so the UI can show
   * them disabled, exactly as the old flow did.
   */
  slotsLeft: number;
  /** Therapist ids free at this time, in assignment-preference order. */
  therapistIds: string[];
};

export type SlotGroup = {
  dayPart: DayPart;
  label: string;
  slots: Slot[];
};

export type DayAvailability = {
  date: IsoDate;
  /** Studio closed that day — no working hours, or blanket time off. */
  closed: boolean;
  /** Open but nothing left, or outside the bookable window. */
  full: boolean;
  /** Before the lead time, or past `BOOKING_MAX_ADVANCE_DAYS`. */
  outOfRange: boolean;
  slotCount: number;
};

export type MonthAvailability = {
  /** `2026-08` */
  month: string;
  timezone: string;
  days: DayAvailability[];
};

export type CustomerDetails = {
  firstName: string;
  lastName: string | null;
  email: string | null;
  /** E.164, e.g. `+6281234567890`. */
  phoneE164: string;
  note: string | null;
};

/** What the wizard posts to `POST /api/booking`. */
export type CreateBookingInput = {
  staff: StaffSelection;
  variantId: string;
  /** Must match a slot returned by the slots endpoint for that day. */
  startAt: string;
  customer: CustomerDetails;
  turnstileToken?: string;
  /** Honeypot. Bots fill it, humans never see it. */
  website?: string;
};

/**
 * A settled payment, on bookings that were paid online.
 *
 * Null on the pay-at-the-studio path and on anything still awaiting payment —
 * only money that actually arrived is described here, so a surface can render
 * this without checking the booking's status first.
 */
export type PaidPayment = {
  channel: "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET" | "CARD";
  /** What was actually collected, which is what a receipt must state. */
  amountPaidIdr: number;
  paidAt: string;
  /** Xendit's id for the charge — what the studio quotes when chasing one. */
  providerId: string | null;
};

/** The booking as every surface renders it: confirmation, email, admin, manage. */
export type BookingSummary = {
  id: string;
  reference: string;
  status: BookingStatusValue;

  startAt: string;
  endAt: string;
  /** Session length without the clean-down buffer — what the customer books. */
  durationMinutes: number;

  serviceTitle: string;
  serviceSlug: string;
  serviceImage: string | null;
  priceIdr: number;

  therapistName: string;
  therapistDisplayName: string;
  therapistSlug: string;
  tier: Tier;

  customer: CustomerDetails;

  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;

  /** The money, once it has arrived. Null on every other path. */
  receipt: PaidPayment | null;
};

/** Everything the confirmation and manage pages need, links included. */
export type BookingView = BookingSummary & {
  manageUrl: string;
  icsUrl: string;
  googleCalendarUrl: string;
  /** Studio-local strings, precomputed so the client never re-derives them. */
  dateLabel: string;
  timeLabel: string;
  /** False once the cancellation cutoff has passed. */
  canCancel: boolean;
  canReschedule: boolean;
};

/** Uniform error body for every booking endpoint. */
export type ApiError = {
  error: string;
  /** Machine-readable, so the wizard can react rather than just print. */
  code:
    | "VALIDATION"
    | "SLOT_TAKEN"
    | "SLOT_INVALID"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "SPAM_REJECTED"
    | "CUTOFF_PASSED"
    | "ALREADY_CANCELLED"
    | "SERVER";
  /** Field-level messages, keyed by the input path. */
  fields?: Record<string, string>;
  /**
   * On `SLOT_TAKEN`, the caller's own unpaid booking for that slot.
   *
   * A clash is usually a stranger; sometimes it is the same person coming back
   * after abandoning a payment, and their own hold is what stands in the way.
   * Telling them to pick another time would be false — the time is still
   * theirs — so the wizard is given what it needs to offer the payment again.
   */
  resume?: { reference: string; manageToken: string };
};

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiError).error === "string" &&
    typeof (value as ApiError).code === "string"
  );
}

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** Boundaries in minutes since studio-local midnight. */
export const DAY_PART_BOUNDARY = {
  afternoonFrom: 12 * 60,
  eveningFrom: 17 * 60,
} as const;

export function dayPartFor(startMinute: number): DayPart {
  if (startMinute < DAY_PART_BOUNDARY.afternoonFrom) return "morning";
  if (startMinute < DAY_PART_BOUNDARY.eveningFrom) return "afternoon";
  return "evening";
}

export const TIER_LABEL: Record<Tier, string> = {
  MASTER: "Master Therapist",
  STANDARD: "Therapist",
};

export const TIER_NOTE: Record<Tier, string> = {
  MASTER: "(Highly Experienced)",
  STANDARD: "(More Affordable)",
};
