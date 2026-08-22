/**
 * The wizard's state machine, its actions, and the draft it keeps in
 * `sessionStorage`.
 *
 * Kept out of `BookingWizard.tsx` so the rules that matter — which step is
 * reachable, and what a change invalidates — can be read in one place. The two
 * that have teeth:
 *
 * - a slot belongs to a staff member *and* a duration, so changing either one
 *   throws the chosen time away. A 9:00 that was free for Ginny is not
 *   necessarily free for Yuni, and offering it again would post a booking the
 *   server has to reject;
 * - a variant belongs to a tier, and the tier comes from the therapist, so
 *   changing staff throws the chosen service away too rather than carrying a
 *   variant id the new therapist cannot deliver.
 *
 * The same machine runs a **reschedule**: `?reschedule=<token>` fills
 * `state.reschedule` from the booking behind that manage link, and the flow
 * shrinks to the two steps that are still questions — a new time, and
 * confirming the move. See `RescheduleState`.
 */
import type {
  Slot,
  StaffOption,
  StaffSelection,
  VariantOption,
} from "@/lib/booking/types";
import { ANY_STAFF } from "@/lib/booking/types";
import type { IsoDate } from "@/lib/booking/time";

import type { BookingDetail } from "./useBookingApi";

export const STEPS = [
  "staff",
  "service",
  "datetime",
  "details",
  "summary",
] as const;

export type StepId = (typeof STEPS)[number];

/** Titles as the previous flow named them. */
export const STEP_LABEL: Record<StepId, string> = {
  staff: "Staff",
  service: "Service",
  datetime: "Date & Time",
  details: "Basic Details",
  summary: "Summary",
};

/**
 * The steps a reschedule has.
 *
 * Arriving from `?reschedule=<token>`, the therapist and the treatment are
 * already decided — it is the same session at a different time — so the first
 * two steps are not questions and are not shown. The visitor picks a time and
 * confirms the move.
 */
export const RESCHEDULE_STEPS = ["datetime", "summary"] as const satisfies
  readonly StepId[];

/** The steps the flow the wizard is currently running actually has. */
export function flowSteps(state: BookingState): readonly StepId[] {
  return state.reschedule ? RESCHEDULE_STEPS : STEPS;
}

/** Position within a flow. Reschedule numbers its two steps 1 and 2. */
export function stepIndex(
  step: StepId,
  steps: readonly StepId[] = STEPS,
): number {
  return steps.indexOf(step);
}

export function parseStep(
  value: string | null,
  steps: readonly StepId[] = STEPS,
): StepId {
  return steps.includes(value as StepId) ? (value as StepId) : steps[0];
}

/* Two labels change when the flow is a reschedule: the day and time being
   picked are a *new* one, and the last step confirms a move rather than
   summarising a booking that does not exist yet. */
const RESCHEDULE_STEP_LABEL: Partial<Record<StepId, string>> = {
  datetime: "New Date & Time",
  summary: "Confirm",
};

export function stepLabel(step: StepId, reschedule: boolean): string {
  return (
    (reschedule ? RESCHEDULE_STEP_LABEL[step] : undefined) ?? STEP_LABEL[step]
  );
}

/** The category chip that clears the filter. Not a real category id. */
export const ALL_CATEGORIES = "ALL";

/**
 * The details step's raw fields.
 *
 * The phone is held in three parts: the selected country and the national
 * number are what the two controls edit, and `phoneE164` is what
 * `customerSchema` and the API see. Keeping all three means a refresh restores
 * the field the visitor was looking at, not just the normalised result.
 */
export type DetailsDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountry: string;
  phoneNational: string;
  phoneE164: string;
  note: string;
  /** Honeypot. Always empty for a real visitor — see `DetailsStep`. */
  website: string;
};

export const emptyDetails: DetailsDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phoneCountry: "ID",
  phoneNational: "",
  phoneE164: "",
  note: "",
  website: "",
};

/**
 * What the wizard is moving, when it is moving something.
 *
 * `null` for a new booking, which is every visit that did not arrive from a
 * manage link. When it is set, `staff` and `variant` stay `null` — they are not
 * choices here — and the booking itself supplies the two ids the availability
 * and slot endpoints are keyed by.
 */
export type RescheduleState = {
  /** The manage token from `?reschedule=`. Both API calls are made with it. */
  token: string;
  /** The booking being moved, as `GET /api/booking/[token]/` returned it. */
  booking: BookingDetail;
  /**
   * Set when the booking can no longer be moved — the cutoff has passed, or it
   * has been cancelled. The picker is replaced by that sentence and a way to
   * reach a person, rather than a button that would keep being refused.
   */
  blocked: string | null;
};

export type BookingState = {
  step: StepId;
  /** `null` for a new booking; set when `?reschedule=<token>` opened this. */
  reschedule: RescheduleState | null;
  /**
   * A manage token the endpoint refused. Transient — never persisted — and
   * held here rather than in the URL so that going Back to the broken link
   * shows the same new booking again instead of waiting on a request whose
   * answer is not going to change.
   */
  rescheduleFailed: string | null;
  /** `null` until the staff step is answered; `"any"` is a real answer. */
  staff: StaffSelection | null;
  /** The chosen therapist, kept so the summary can name them after a refresh. */
  staffOption: StaffOption | null;
  variant: VariantOption | null;
  category: string;
  /** `2026-08`, the month the calendar is showing. */
  month: string;
  date: IsoDate | null;
  slot: Slot | null;
  details: DetailsDraft;
  /** Field-level messages, keyed as `customerSchema` paths. */
  errors: Record<string, string>;
  submitting: boolean;
  /** Whole-form message: a server error, or the slot-taken recovery note. */
  notice: string | null;
  /** Bumped to force the slot list to refetch after a slot is lost. */
  slotsToken: number;
};

/**
 * `preselected` is a therapist a "Book with Ginny" link already chose, resolved
 * on the server so the very first render is already past step one. Discovering
 * it in an effect instead made the staff step paint and then vanish, which read
 * as a glitch rather than as a shortcut.
 */
export function initialState(
  step: StepId,
  month: string,
  preselected: StaffOption | null = null,
): BookingState {
  return {
    step,
    reschedule: null,
    rescheduleFailed: null,
    staff: preselected?.id ?? null,
    staffOption: preselected,
    variant: null,
    category: ALL_CATEGORIES,
    month,
    date: null,
    slot: null,
    details: emptyDetails,
    errors: {},
    submitting: false,
    notice: null,
    slotsToken: 0,
  };
}

export type BookingAction =
  | { type: "goto"; step: StepId }
  | { type: "restore"; draft: BookingState }
  | { type: "chooseStaff"; staff: StaffSelection; option: StaffOption | null }
  | { type: "chooseCategory"; category: string }
  | { type: "chooseVariant"; variant: VariantOption }
  | { type: "chooseMonth"; month: string }
  | { type: "chooseDate"; date: IsoDate }
  | { type: "chooseSlot"; slot: Slot }
  | { type: "setDetail"; field: keyof DetailsDraft; value: string }
  | { type: "setPhone"; country: string; national: string; e164: string }
  | { type: "setErrors"; errors: Record<string, string> }
  | { type: "clearError"; field: string }
  | { type: "submitStart" }
  | { type: "submitFailed"; notice: string; errors?: Record<string, string> }
  | { type: "slotLost"; notice: string }
  | {
      type: "startReschedule";
      token: string;
      booking: BookingDetail;
      /** The month the session currently sits in — where the calendar opens. */
      month: string;
      blocked: string | null;
    }
  | { type: "rescheduleBlocked"; message: string }
  | {
      type: "rescheduleUnavailable";
      /** The token that was refused. */
      token: string;
      notice: string;
      /** The ordinary draft, if this tab had one. Restored rather than lost. */
      draft: BookingState | null;
    }
  | { type: "dismissNotice" };

/** `errors` without one key. Written out because the wizard clears a field's
 *  message the moment it is edited, in three different actions. */
function withoutError(
  errors: Record<string, string>,
  field: string,
): Record<string, string> {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

export function reducer(
  state: BookingState,
  action: BookingAction,
): BookingState {
  switch (action.type) {
    case "goto":
      return state.step === action.step
        ? state
        : { ...state, step: action.step };

    case "restore":
      return action.draft;

    case "chooseStaff": {
      if (state.staff === action.staff) {
        return { ...state, staffOption: action.option };
      }
      /* A different therapist means a different tier, so the variant, the day
         and the time all stop being answerable. */
      return {
        ...state,
        staff: action.staff,
        staffOption: action.option,
        variant: null,
        category: ALL_CATEGORIES,
        date: null,
        slot: null,
        notice: null,
      };
    }

    case "chooseCategory":
      return { ...state, category: action.category };

    case "chooseVariant": {
      if (state.variant?.id === action.variant.id) return state;
      /* The day survives — the visitor already said which day suits them — but
         the time does not: a 90-minute session does not start where a 60 did. */
      return { ...state, variant: action.variant, slot: null, notice: null };
    }

    case "chooseMonth":
      return { ...state, month: action.month };

    case "chooseDate":
      return state.date === action.date
        ? state
        : { ...state, date: action.date, slot: null };

    case "chooseSlot":
      return { ...state, slot: action.slot, notice: null };

    case "setDetail":
      return {
        ...state,
        details: { ...state.details, [action.field]: action.value },
        errors: withoutError(state.errors, action.field),
      };

    case "setPhone":
      return {
        ...state,
        details: {
          ...state.details,
          phoneCountry: action.country,
          phoneNational: action.national,
          phoneE164: action.e164,
        },
        errors: withoutError(state.errors, "phoneE164"),
      };

    case "setErrors":
      return { ...state, errors: action.errors };

    case "clearError":
      return { ...state, errors: withoutError(state.errors, action.field) };

    case "submitStart":
      return { ...state, submitting: true, notice: null };

    case "submitFailed":
      return {
        ...state,
        submitting: false,
        notice: action.notice,
        errors: action.errors ?? state.errors,
      };

    case "slotLost":
      /* The one error with a specific recovery: drop the time, go back to the
         day, and bump the token so the list is refetched rather than redrawn
         from the stale response that offered the slot in the first place. */
      return {
        ...state,
        submitting: false,
        step: "datetime",
        slot: null,
        notice: action.notice,
        slotsToken: state.slotsToken + 1,
      };

    case "startReschedule": {
      /* A draft restored a moment ago already carries the day and time the
         visitor was looking at, and the month they had paged to; a fresh
         arrival opens on the month the session is in today. The booking is
         always the one just fetched, never the one the draft remembered. */
      const seeded = state.reschedule !== null;

      return {
        ...state,
        reschedule: {
          token: action.token,
          booking: action.booking,
          blocked: action.blocked,
        },
        month: seeded ? state.month : action.month,
        date: seeded ? state.date : null,
        slot: seeded ? state.slot : null,
        step: action.blocked ? "datetime" : state.step,
        notice: null,
      };
    }

    case "rescheduleBlocked":
      if (state.reschedule === null) return state;
      /* The move was refused for a reason no retry can fix. Drop the chosen
         time so nothing offers to send it again. */
      return {
        ...state,
        submitting: false,
        step: "datetime",
        slot: null,
        notice: null,
        reschedule: { ...state.reschedule, blocked: action.message },
      };

    case "rescheduleUnavailable":
      /* The link could not be opened at all. Rather than a dead page, this
         becomes an ordinary new booking with a line saying so — picking up any
         new booking this tab had already started, which the reschedule was
         never part of and must not have thrown away. */
      return {
        ...(action.draft ?? initialState("staff", state.month)),
        reschedule: null,
        rescheduleFailed: action.token,
        step: "staff",
        submitting: false,
        errors: {},
        notice: action.notice,
      };

    case "dismissNotice":
      return { ...state, notice: null };
  }
}

/** Whether the step's own question has been answered. */
export function isStepComplete(state: BookingState, step: StepId): boolean {
  switch (step) {
    case "staff":
      return state.staff !== null;
    case "service":
      return state.variant !== null;
    case "datetime":
      return state.slot !== null;
    case "details":
      return state.details.firstName.trim() !== "" && state.details.phoneE164 !== "";
    case "summary":
      return false;
  }
}

/**
 * The furthest step the current answers justify showing.
 *
 * Used to clamp a URL someone typed, pasted or reached with the Back button
 * after clearing an earlier choice — `?step=summary` with no service picked
 * would otherwise render a summary of nothing.
 */
export function furthestStep(state: BookingState): StepId {
  /* A reschedule has answered the first two questions before it started; all
     that is outstanding is the new time. */
  if (state.reschedule) return state.slot === null ? "datetime" : "summary";
  if (state.staff === null) return "staff";
  if (state.variant === null) return "service";
  if (state.slot === null) return "datetime";
  if (!isStepComplete(state, "details")) return "details";
  return "summary";
}

export function canVisit(state: BookingState, step: StepId): boolean {
  const steps = flowSteps(state);
  if (!steps.includes(step)) return false;
  return stepIndex(step, steps) <= stepIndex(furthestStep(state), steps);
}

/** A therapist id, or the "Any Staff" sentinel, for the API query string. */
export function staffParam(staff: StaffSelection | null): StaffSelection {
  return staff ?? ANY_STAFF;
}

// ── Draft persistence ─────────────────────────────────────────────────────

/* Bumped whenever the shape above changes, so a draft written by an older
   build is dropped rather than restored into fields that no longer exist. */
const DRAFT_KEY = "flexflow.booking.draft.v1";

/**
 * Which draft a flow writes to.
 *
 * A reschedule gets its own key, and one per booking: someone who starts a new
 * booking, then opens the manage link from an older confirmation in the same
 * tab, must not find the two halves of those two drafts mixed together — the
 * new booking's chosen service in the reschedule, or the reschedule's day in
 * the new booking.
 */
function draftKey(token: string | null): string {
  return token === null ? DRAFT_KEY : `${DRAFT_KEY}.reschedule.${token}`;
}

/** Session storage, not local: a draft should not outlive the tab. */
function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    /* Safari in private mode throws on access rather than returning null. */
    return null;
  }
}

export function saveDraft(state: BookingState): void {
  const storage = store();
  if (!storage) return;

  /* Transient state is deliberately not persisted: a refresh should not
     restore a spinner, an error from a request that is no longer in flight, or
     a step the answers no longer support. */
  const draft: BookingState = {
    ...state,
    submitting: false,
    notice: null,
    errors: {},
    /* Not persisted: a reload should ask the endpoint again and, if it refuses
       again, say so — rather than silently opening a blank new booking. */
    rescheduleFailed: null,
  };

  try {
    storage.setItem(
      draftKey(state.reschedule?.token ?? null),
      JSON.stringify(draft),
    );
  } catch {
    /* Quota or private mode. A lost draft is a worse refresh, not a broken
       booking, so there is nothing useful to tell the visitor. */
  }
}

/** `token` is the one from `?reschedule=`, or `null` for a new booking. */
export function loadDraft(token: string | null = null): BookingState | null {
  const storage = store();
  if (!storage) return null;

  try {
    const raw = storage.getItem(draftKey(token));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BookingState>;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.month !== "string") return null;
    /* The key says which flow this is; a draft that disagrees was written by a
       different build and is not worth reconstructing. */
    if ((parsed.reschedule?.token ?? null) !== token) return null;

    const steps = token === null ? STEPS : RESCHEDULE_STEPS;
    const base = initialState(parseStep(parsed.step ?? null, steps), parsed.month);

    return {
      ...base,
      ...parsed,
      /* The booking itself is refetched on every arrival — the studio may have
         moved or cancelled it since — so what the draft remembered about it is
         replaced by `startReschedule`, and `blocked` starts clear. */
      reschedule: parsed.reschedule
        ? { ...parsed.reschedule, blocked: null }
        : null,
      rescheduleFailed: null,
      details: { ...emptyDetails, ...(parsed.details ?? {}) },
      submitting: false,
      notice: null,
      errors: {},
    };
  } catch {
    return null;
  }
}

export function clearDraft(token: string | null = null): void {
  try {
    store()?.removeItem(draftKey(token));
  } catch {
    /* See `saveDraft`. */
  }
}
