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
 * Trimmed again on 2026-09-04, after the owner reviewed the built form and
 * asked for "a friendly more minimalistic approach":
 * - The two health checkbox lists became one (see `HEALTH_CONDITIONS`).
 * - The six consent tick boxes became two (see `AFTERCARE_ACKNOWLEDGEMENT`).
 * - The digital signature, the repeated "Client full name" and the signature
 *   date are gone; the name is only asked once now, at the top.
 *
 * Five rows left the form in that pass. They are not deleted from this array
 * and quietly forgotten — `prisma/migrations/20260904050000_intake_simplify`
 * removes their definitions outright, which is only safe because no client
 * has submitted this form yet.
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

/**
 * One list where the JotForm had two — "Current Health Screening" and
 * "Medical History", merged at the owner's request on 2026-09-04 ("we should
 * try move this into one"). They overlapped heavily: cancer was in both, and
 * so were blood clots / clotting disorder, heart / cardiovascular condition.
 * Twenty-four boxes across two questions became nineteen across one.
 *
 * The merge loses the *now vs. previously* distinction the two questions drew
 * between them, which is clinically real — a client treated for cancer ten
 * years ago is not the same as one in treatment today. The details box below
 * asks for timing to put that back, rather than the form silently dropping it.
 */
const HEALTH_CONDITIONS = [
  "Cancer",
  "Blood clots or clotting disorder",
  "Heart or cardiovascular condition",
  "High blood pressure",
  "Circulatory disorder",
  "Lymphatic condition",
  "Diabetes",
  "Autoimmune condition",
  "Respiratory condition",
  "Neurological condition",
  "Digestive disorder",
  "Hormonal condition",
  "Musculoskeletal condition",
  "Pregnant or trying to conceive",
  "Recent surgery",
  "Infection or fever",
  "Open wounds or skin irritation",
  "Other",
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

/**
 * Six tick boxes became two on 2026-09-04, at the owner's request
 * ("normally a confirmation would be just 1 or 2 tick that ticks all info").
 * Each statement below is one whole group rather than two groups of several,
 * and that structure is load-bearing: a required CHECKBOX_GROUP validates as
 * "at least one option selected" (`schemaForField`), so two statements in one
 * group could be half-agreed to. One statement per group means both have to
 * be ticked, which is what a consent record needs.
 *
 * They stay two rather than one because they affirm different things — that
 * what the client wrote is true, and that they agree to be treated. Collapsing
 * those into a single box would make a disclosure and a consent indivisible.
 */
const AFTERCARE_ACKNOWLEDGEMENT = [
  "I have read the notes above, will follow the activity restrictions before and after treatment, and will tell my practitioner straight away if I feel pain, dizziness, swelling or any unusual reaction.",
];

const DISCLOSURE_AND_CONSENT = [
  "Everything I have entered here is true and complete, including any health conditions, medications and allergies — and I consent to receive the treatment described.",
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
  /* Keeps the `currentHealthScreening` key even though it now covers medical
     history too. The key is internal, and reusing it means the merged question
     inherits this row's `sortOrder` — so it stays first in the section instead
     of being appended after every follow-up question, which is where a new key
     would land (`prisma/seed.ts` assigns new rows `max + 1`). */
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "currentHealthScreening",
    kind: "CHECKBOX_GROUP",
    label: "Do you have, or have you had, any of the following?",
    helpText: "Tick anything that applies, now or in the past.",
    required: true,
    options: HEALTH_CONDITIONS,
  },
  {
    sectionKey: "HEALTH_SCREENING",
    fieldKey: "currentHealthScreeningDetails",
    kind: "TEXTAREA",
    label: "Tell us a little more",
    helpText:
      "Roughly when, and anything else your therapist should know. This is " +
      "where the timing the merged question no longer asks for belongs.",
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
    label: "Before & after treatment",
    required: true,
    options: AFTERCARE_ACKNOWLEDGEMENT,
  },
  {
    sectionKey: "CONSENT",
    fieldKey: "clientDisclosureConsent",
    kind: "CHECKBOX_GROUP",
    label: "Disclosure & consent",
    required: true,
    options: DISCLOSURE_AND_CONSENT,
  },
  /* The signature, the repeated full name and the signature date were removed
     on 2026-09-04 at the owner's request: "they dont need digital sign, also
     these details are already filled at the top". The name is asked once, in
     Client Details; the date the form was signed is `IntakeSubmission.createdAt`.
     What now records consent is the two ticks above, together with that
     timestamp and `IntakeSubmission.ipAddress`. `signatureUrl` stays a column
     on the model and is simply written empty — see `app/api/intake/route.ts`,
     which only demands a signature while a SIGNATURE field exists. */
];
