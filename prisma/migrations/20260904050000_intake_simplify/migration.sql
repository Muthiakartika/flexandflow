-- Owner review of the built intake form, 2026-09-04. Three requests:
--   "we should try move this into one"      → the two health lists merge
--   "normally a confirmation would be just  → six consent ticks become two
--    1 or 2 tick that ticks all info"
--   "they dont need digital sign, also      → signature, repeated full name
--    these details are already filled           and signature date removed
--    at the top"
--
-- Why this is a migration and not just an edit to lib/intake/seed-fields.ts:
-- prisma/seed.ts deliberately never overwrites `label`, `helpText`, `required`
-- or `options` on a row that already exists, because those four are what the
-- admin panel edits and a re-seed must not revert the studio's own wording.
-- Changing them for rows already in the database is therefore only possible
-- here. `sectionKey` and `kind` are the exception the seed does sync.

-- The merged health question. Keeps its own fieldKey and therefore its
-- sortOrder, so it stays at the top of Health Screening rather than being
-- appended after the follow-ups the way a new key would be.
UPDATE "IntakeFormField"
SET "label"    = 'Do you have, or have you had, any of the following?',
    "helpText" = 'Tick anything that applies, now or in the past.',
    "options"  = ARRAY[
      'Cancer',
      'Blood clots or clotting disorder',
      'Heart or cardiovascular condition',
      'High blood pressure',
      'Circulatory disorder',
      'Lymphatic condition',
      'Diabetes',
      'Autoimmune condition',
      'Respiratory condition',
      'Neurological condition',
      'Digestive disorder',
      'Hormonal condition',
      'Musculoskeletal condition',
      'Pregnant or trying to conceive',
      'Recent surgery',
      'Infection or fever',
      'Open wounds or skin irritation',
      'Other',
      'None of the above'
    ]::text[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldKey" = 'currentHealthScreening';

-- Its follow-up box now carries the "when" that the merged question stopped
-- asking: the old pair drew a now-vs-previously line this one does not.
UPDATE "IntakeFormField"
SET "label"    = 'Tell us a little more',
    "helpText" = 'Roughly when, and anything else your therapist should know. This is where the timing the merged question no longer asks for belongs.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldKey" = 'currentHealthScreeningDetails';

-- One statement per group, not two groups of several. A required
-- CHECKBOX_GROUP validates as "at least one option selected", so several
-- statements sharing a group could be half-agreed to; one each means both
-- have to be ticked.
UPDATE "IntakeFormField"
SET "label"   = 'Before & after treatment',
    "options" = ARRAY['I have read the notes above, will follow the activity restrictions before and after treatment, and will tell my practitioner straight away if I feel pain, dizziness, swelling or any unusual reaction.']::text[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldKey" = 'activityRestrictionsAcknowledgement';

UPDATE "IntakeFormField"
SET "label"   = 'Disclosure & consent',
    "options" = ARRAY['Everything I have entered here is true and complete, including any health conditions, medications and allergies — and I consent to receive the treatment described.']::text[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldKey" = 'clientDisclosureConsent';

-- Deleted outright rather than archived, which is the opposite of what
-- 20260904040000_remove_emergency_contact_name did for a field of the same
-- kind. Archiving keeps a definition so historical answers stay readable and
-- keeps its Google Sheet column — worth it when submissions reference it.
-- No client has ever submitted this form: the only two rows in
-- IntakeSubmission are the owner's own tests, and the sheet was emptied by
-- hand on 2026-09-04. Five dead columns in a thirty-column sheet the studio
-- is about to start reading is the worse outcome, so these go.
DELETE FROM "IntakeFormField"
WHERE "fieldKey" IN (
  'medicalHistory',
  'medicalHistoryDetails',
  'signatureFullName',
  'signature',
  'signatureDate'
);
