-- "Selected Treatment / Service" offered six generic buckets carried over
-- from the JotForm — Massage / Bodywork / Lymphatic Drainage / Facial /
-- Stretch Therapy / Other — none of which name a treatment the studio
-- actually sells. A client picking "Massage" tells the therapist nothing
-- about whether they booked a sport massage, a pregnancy massage or the
-- men's lymphatic detox, which are different treatments with different
-- contraindications.
--
-- Replaced with the eight treatments the owner chose on 2026-09-09: the
-- seven priced services in `pricedServiceSlugs` order from
-- lib/data/services.ts (the WordPress grid order /services and /price-list
-- share), each labelled with that service's own `title` verbatim, then
-- Combo Stretching and Massage, which is bookable but has no service page
-- and is labelled from lib/data/priceList.ts. Kept in step with the
-- TREATMENTS array in lib/intake/seed-fields.ts, whose comment records what
-- was left out and why.
--
-- Why this is a migration and not just that edit: prisma/seed.ts never
-- overwrites `options` on a row that already exists, because options are
-- what the admin panel edits and a re-seed must not revert the studio's own
-- wording. See 20260904050000_intake_simplify for the same reasoning.
--
-- Nothing branches on these values: CONDITIONAL_FIELDS in
-- lib/intake/conditional.ts has no rule keyed on `selectedTreatment`, and
-- the answer is stored as free text, so no existing submission is
-- invalidated by an option disappearing.
UPDATE "IntakeFormField"
SET "options" = ARRAY[
      'Lymphatic Detox Massage for Men',
      'Trauma Healing Bali',
      'Assisted Stretching Bali',
      'Sport Massage',
      'Cupping Therapy',
      'Lymphatic Drainage',
      'Pregnancy Massage Service',
      'Combo Stretching and Massage'
    ]::text[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldKey" = 'selectedTreatment';
