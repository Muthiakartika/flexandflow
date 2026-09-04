/**
 * The intake form's field content, seeded once and editable by SUPER_ADMIN
 * from `/admin/intake/` after that — see `prisma/seed.ts`, which never
 * overwrites a row that already exists.
 *
 * Transcribed from the live JotForm at
 * https://form.jotform.com/262441853736058 on 2026-09-03. `sortOrder` is not
 * set here — `prisma/seed.ts` assigns it from this array's own order, so
 * reordering a row is moving it in this list.
 *
 * Trimmed from the JotForm original on 2026-09-03, at the owner's request:
 * Nationality, Emergency Contact Number and Relationship to Emergency
 * Contact are gone entirely; "Middle Name" is gone from every NAME field
 * (see `nameAnswerSchema`, which no longer has a middle-name part at all —
 * this is not a per-row option); and the address collapsed from five parts
 * to one free-text line (`currentAddress` is now TEXT, not ADDRESS). Fields
 * removed this way are deleted outright, not hidden — see the cleanup step
 * in `prisma/seed.ts`, which drops any non-custom row whose `fieldKey` is no
 * longer in this array.
 *
 * Two judgment calls worth flagging to the owner rather than silently baking
 * in:
 * - "Activity Restrictions Acknowledgement" and "Client Disclosure &
 *   Consent" are CHECKBOX_GROUP rows validated the same as every other
 *   checkbox group here — at least one option selected, not "every option
 *   must be checked". JotForm's own default checkbox-list behaviour is the
 *   same "at least one", so this is very likely a faithful port rather than
 *   a weaker one, but it was not possible to confirm the original widget's
 *   exact client-side rule from the rendered page alone.
 * - "Client full name" in the Signature block duplicates "Full Name" in
 *   Client Details — the live form asks again immediately before signing,
 *   and this keeps that re-confirmation rather than assuming it was
 *   redundant.
 */
import type { IntakeFieldKind, IntakeSectionKey } from "@/lib/intake/types";
import { CORE_FIELD_KEYS } from "@/lib/intake/schema";

export type SeedIntakeField = {
  sectionKey: IntakeSectionKey;
  fieldKey: string;
  kind: IntakeFieldKind;
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];
};

const TREATMENTS = [
  "Massage",
  "Bodywork",
  "Lymphatic Drainage",
  "Facial",
  "Stretch Therapy",
  "Other",
];

const CURRENT_HEALTH_SCREENING = [
  "Cancer",
  "Blood clots",
  "Heart condition",
  "High blood pressure",
  "Diabetes",
  "Autoimmune condition",
  "Pregnant or trying to conceive",
  "Recent surgery",
  "Infection or fever",
  "Open wounds or skin irritation",
  "Others",
  "None of the above",
];

const MEDICAL_HISTORY = [
  "Cancer",
  "Blood clotting disorder",
  "Cardiovascular condition",
  "Lymphatic condition",
  "Circulatory disorder",
  "Respiratory condition",
  "Neurological condition",
  "Digestive disorder",
  "Hormonal condition",
  "Musculoskeletal condition",
  "Others",
  "None of the above",
];

const RECENT_ACTIVITIES = [
  "Recent surgery",
  "Recent injury",
  "Intense exercise",
  "Long-haul travel",
  "Alcohol consumption",
  "Dehydration",
  "Stress",
  "Other",
];

const LYMPHATIC_SCREENING = [
  "Swollen glands",
  "Active infection",
  "Fever",
  "Unexplained swelling",
  "History of cancer",
  "Blood clots",
  "Heart condition",
  "Kidney condition",
  "Liver condition",
  "None of the above",
  "Other",
];

const ACTIVITY_RESTRICTIONS_STATEMENTS = [
  "I acknowledge that I will follow any activity restrictions provided by my practitioner before and after treatment.",
  "I understand that it is my responsibility to inform my practitioner if I experience pain, discomfort, dizziness, swelling, or any unusual reaction during or after treatment.",
];

const CLIENT_DISCLOSURE_STATEMENTS = [
  "I confirm that I have read and understand the client disclosure information provided in this form.",
  "I confirm that I have disclosed all relevant health information, conditions, medications, allergies, and concerns to the best of my knowledge.",
  "I agree that the information I have provided is true and complete to the best of my knowledge.",
  "I consent to receive the treatment or service described in this form.",
];

const FILL_IF_RECEIVED_BEFORE = "Fill it if you have received the treatment before";

export const SEED_INTAKE_FIELDS: SeedIntakeField[] = [
  // ── Client Details ────────────────────────────────────────────────────
  {
    sectionKey: "CLIENT_DETAILS",
    fieldKey: CORE_FIELD_KEYS.fullName,
    kind: "NAME",
    label: "Full Name",
    required: true,
  },
  {
    sectionKey: "CLIENT_DETAILS",
    fieldKey: "dateOfBirth",
    kind: "DATE",
    label: "Date of Birth",
    required: true,
  },
  {
    sectionKey: "CLIENT_DETAILS",
    fieldKey: CORE_FIELD_KEYS.whatsapp,
    kind: "PHONE",
    label: "WhatsApp Number",
    required: true,
  },
  {
    sectionKey: "CLIENT_DETAILS",
    fieldKey: CORE_FIELD_KEYS.email,
    kind: "TEXT",
    label: "Email Address",
    required: true,
  },
  {
    sectionKey: "CLIENT_DETAILS",
    fieldKey: "currentAddress",
    kind: "TEXT",
    label: "Current Address / Hotel / Villa in Bali",
    required: true,
  },
  {
    sectionKey: "CLIENT_DETAILS",
    fieldKey: "passportIdNumber",
    kind: "TEXT",
    label: "Passport / ID Number",
    required: true,
  },

  // ── Appointment & Treatment History ──────────────────────────────────
  {
    sectionKey: "APPOINTMENT_HISTORY",
    fieldKey: "selectedTreatment",
    kind: "DROPDOWN",
    label: "Selected Treatment / Service",
    required: true,
    options: TREATMENTS,
  },
  {
    sectionKey: "APPOINTMENT_HISTORY",
    fieldKey: "preferredAppointmentDate",
    kind: "DATE",
    label: "Preferred Appointment Date",
    required: true,
  },
  {
    sectionKey: "APPOINTMENT_HISTORY",
    fieldKey: "receivedTreatmentBefore",
    kind: "YES_NO",
    label: "Have you received this treatment before?",
    required: true,
  },
  {
    sectionKey: "APPOINTMENT_HISTORY",
    fieldKey: "lastTreatmentDate",
    kind: "DATE",
    label: "When was your last treatment?",
    helpText: FILL_IF_RECEIVED_BEFORE,
    required: false,
  },
  {
    sectionKey: "APPOINTMENT_HISTORY",
    fieldKey: "adverseReactionBefore",
    kind: "YES_NO",
    label:
      "Have you experienced any adverse reaction after a previous massage or bodywork treatment?",
    helpText: FILL_IF_RECEIVED_BEFORE,
    required: false,
  },
  {
    sectionKey: "APPOINTMENT_HISTORY",
    fieldKey: "adverseReactionDetails",
    kind: "TEXTAREA",
    label: "Adverse reaction details",
    helpText: FILL_IF_RECEIVED_BEFORE,
    required: false,
  },

  // ── Health Screening ──────────────────────────────────────────────────
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "currentHealthScreening",
    kind: "CHECKBOX_GROUP",
    label:
      "Current Health Screening — do you currently have or have you recently " +
      "experienced any of the following?",
    required: true,
    options: CURRENT_HEALTH_SCREENING,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "currentHealthScreeningDetails",
    kind: "TEXTAREA",
    label: "Current Health Screening Details",
    helpText: "Fill it if you have health screening details",
    required: false,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "medicalHistory",
    kind: "CHECKBOX_GROUP",
    label: "Medical History",
    required: true,
    options: MEDICAL_HISTORY,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "medicalHistoryDetails",
    kind: "TEXTAREA",
    label: "Medical History Details",
    helpText: "Fill it if you have medical history details",
    required: false,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "takesMedications",
    kind: "YES_NO",
    label: "Do you take any medications?",
    required: true,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "medicationDetails",
    kind: "TEXTAREA",
    label: "Medication Details",
    helpText: "Fill it if you have taken any medications",
    required: false,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "underProfessionalCare",
    kind: "YES_NO",
    label: "Are you currently under professional care?",
    required: true,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "professionalCareDetails",
    kind: "TEXTAREA",
    label: "Professional Care Details",
    helpText: "Fill it if you have professional care details",
    required: false,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "allergyInfoNotice",
    kind: "INFO",
    label: "Massage Oil / Product Allergy Information",
    helpText:
      "Massage treatments may use massage oil, essential oils, creams, lotions, " +
      "balms, or other topical products.",
    required: false,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "advisedToAvoidTreatment",
    kind: "YES_NO",
    label: "Have you been advised to avoid treatment?",
    required: true,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "avoidTreatmentDetails",
    kind: "TEXTAREA",
    label: "Avoid Treatment Details",
    helpText: "Fill it if you have been advised to avoid any treatment",
    required: false,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "hasAllergiesOrSensitivities",
    kind: "DROPDOWN",
    label: "Do you have any allergies or sensitivities?",
    required: true,
    options: ["Yes", "No", "Not Sure"],
  },

  // ── Recent Activities & Lymphatic Screening ──────────────────────────
  {
    sectionKey: "LYMPHATIC_SCREENING",
    fieldKey: "recentActivitiesLifestyle",
    kind: "CHECKBOX_GROUP",
    label: "Recent Activities & Lifestyle",
    required: true,
    options: RECENT_ACTIVITIES,
  },
  {
    sectionKey: "LYMPHATIC_SCREENING",
    fieldKey: "lymphaticDrainageScreening",
    kind: "CHECKBOX_GROUP",
    label: "Lymphatic Drainage Screening",
    required: true,
    options: LYMPHATIC_SCREENING,
  },

  // ── Acknowledgement & Consent, and Signature ─────────────────────────
  /* Moved here from Appointment & Treatment History on 2026-09-03, at the
     owner's request: an aftercare/risk notice is most useful as a last
     reminder right before someone commits, not as a wall of text on the way
     in — the same reasoning terms-and-conditions sit right above the
     checkbox that agrees to them. "Massage Oil / Product Allergy
     Information" stays where it is, in Health Screening, because it is
     context for the allergy question right after it, not an aftercare note. */
  {
    sectionKey: "CONSENT",
    fieldKey: "beforeAfterNotice",
    kind: "INFO",
    label: "Important Before & After Treatment Notice",
    helpText:
      "Clients should avoid strenuous exercise, sports, heavy lifting, alcohol, sauna, " +
      "steam room, hot yoga, ice baths, and other intensive physical or recovery " +
      "activities for the period recommended by the practitioner. Doing these " +
      "activities too soon before or after treatment may increase the chance of " +
      "soreness, swelling, fatigue, discomfort, bruising, or other unwanted reactions.",
    required: false,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "postTreatmentCaution",
    kind: "INFO",
    label: "Post-Treatment Caution",
    helpText:
      "Temporary reactions after massage or bodywork may include mild swelling, " +
      "soreness, tenderness, fatigue, lightheadedness, mild bruising, skin redness " +
      "or sensitivity, increased thirst, or temporary digestive changes. Severe " +
      "swelling, rapidly increasing swelling, severe pain, persistent fever, " +
      "difficulty breathing, significant skin changes, or worsening symptoms are " +
      "not considered normal post-treatment reactions and should be assessed by an " +
      "appropriate healthcare professional.",
    required: false,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "activityRestrictionsAcknowledgement",
    kind: "CHECKBOX_GROUP",
    label: "Activity Restrictions Acknowledgement",
    required: true,
    options: ACTIVITY_RESTRICTIONS_STATEMENTS,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "clientDisclosureConsent",
    kind: "CHECKBOX_GROUP",
    label: "Client Disclosure & Consent",
    required: true,
    options: CLIENT_DISCLOSURE_STATEMENTS,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "signatureFullName",
    kind: "NAME",
    label: "Client full name",
    required: true,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "signature",
    kind: "SIGNATURE",
    label: "Digital signature",
    required: true,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "signatureDate",
    kind: "DATE",
    label: "Date",
    required: true,
  },
];
