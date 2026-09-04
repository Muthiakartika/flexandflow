/**
 * Which fields are conditionally shown, and on what.
 *
 * Shared by rendering and server validation. Hidden answers are omitted,
 * even when the admin marks a dependent field required. Parent visibility
 * is checked recursively so stale child answers cannot reveal grandchildren.
 *
 * Not admin-editable and not in the database, for the same reason
 * `fieldKey`/`kind`/`sectionKey` are not — this is part of the form's fixed
 * *shape*, not its editable *content*.
 */

export type ConditionalRule = {
  /** The field whose answer decides whether this one is shown. */
  when: string;
  show: (value: unknown) => boolean;
};

const isYes = (value: unknown): boolean => value === "Yes";

/** For a checkbox-group screening question: shown once something other than
 *  "None of the above" is picked, not merely once anything is picked. */
const hasRealSelection = (value: unknown): boolean =>
  Array.isArray(value) && value.some((entry) => entry !== "None of the above");

export const CONDITIONAL_FIELDS: Record<string, ConditionalRule> = {
  lastTreatmentDate: { when: "receivedTreatmentBefore", show: isYes },
  adverseReactionBefore: { when: "receivedTreatmentBefore", show: isYes },
  adverseReactionDetails: { when: "adverseReactionBefore", show: isYes },
  /* `currentHealthScreening` now covers medical history too — the two lists
     were merged on 2026-09-04 and `medicalHistoryDetails` went with the
     question that fed it. */
  currentHealthScreeningDetails: {
    when: "currentHealthScreening",
    show: hasRealSelection,
  },
  medicationDetails: { when: "takesMedications", show: isYes },
  professionalCareDetails: { when: "underProfessionalCare", show: isYes },
  avoidTreatmentDetails: { when: "advisedToAvoidTreatment", show: isYes },
};

/** True when `fieldKey` has no rule (always shown) or its rule currently passes. */
export function isFieldVisible(
  fieldKey: string,
  answers: Record<string, unknown>,
  activeKeys?: ReadonlySet<string>,
): boolean {
  const rule = CONDITIONAL_FIELDS[fieldKey];
  if (!rule || (activeKeys && !activeKeys.has(rule.when))) return true;
  return isFieldVisible(rule.when, answers, activeKeys) && rule.show(answers[rule.when]);
}
