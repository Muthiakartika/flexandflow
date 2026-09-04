-- Owner request: remove Emergency Contact Name from new intake forms.
-- Keep its definition and historical answers for exports and restoration.
UPDATE "IntakeFormField"
SET "archived" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldKey" = 'emergencyContactName';
