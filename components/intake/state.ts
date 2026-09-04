"use client";

/**
 * The intake form's client state: one flat `answers` object keyed by
 * `fieldKey`, plus submit status. Much simpler than booking's `state.ts` —
 * there is no step navigation to reconstruct, since this is one scrolling
 * page rather than a wizard.
 */

export type Answers = Record<string, unknown>;

export type IntakeFormState = {
  draftLoaded: boolean;
  answers: Answers;
  errors: Record<string, string>;
  status: "idle" | "submitting" | "success" | "error";
  serverMessage: string | null;
  reference: string | null;
};

export type IntakeFormAction =
  | { type: "RESTORE_DRAFT"; answers: Answers }
  | { type: "SET_ANSWER"; fieldKey: string; value: unknown }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; reference: string }
  | { type: "SUBMIT_ERROR"; message: string; fields?: Record<string, string> };

export function intakeFormReducer(
  state: IntakeFormState,
  action: IntakeFormAction,
): IntakeFormState {
  switch (action.type) {
    case "RESTORE_DRAFT":
      return state.draftLoaded ? state : { ...state, answers: action.answers, draftLoaded: true };
    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.fieldKey]: action.value },
        errors: { ...state.errors, [action.fieldKey]: "" },
      };
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "SUBMIT_START":
      return { ...state, status: "submitting", serverMessage: null };
    case "SUBMIT_SUCCESS":
      return { ...state, status: "success", reference: action.reference };
    case "SUBMIT_ERROR":
      return {
        ...state,
        status: "error",
        serverMessage: action.message,
        errors: action.fields ?? state.errors,
      };
    default:
      return state;
  }
}

const DRAFT_KEY = "flexflow.intake.draft.v1";

/** Best-effort — a private window or a full storage quota still lets the
 *  form work, just without a draft to come back to. */
export function loadDraft(): Answers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Answers : null;
  } catch {
    return null;
  }
}

export function saveDraft(answers: Answers): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  } catch {
    /* Storage full or disabled. The form still works without a draft. */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* Nothing to do. */
  }
}
