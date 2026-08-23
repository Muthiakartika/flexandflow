-- Make an unpaid hold block its slot.
--
-- `AWAITING_PAYMENT` has to sit alongside `PENDING` and `CONFIRMED` in the
-- no-overlap constraint, or somebody at the payment screen can have the time
-- taken out from under them and end up paying for a slot that is gone.
--
-- **This is deliberately a second migration.** Postgres will not let a value
-- added by `ALTER TYPE … ADD VALUE` be *used* in the same transaction, and
-- Prisma runs each migration inside one. Adding the enum value and referencing
-- it in this predicate together fails with "unsafe use of new value of enum
-- type" — so the previous migration adds it, commits, and this one uses it.
--
-- Everything else about the constraint is unchanged; see
-- `20260820000100_booking_no_overlap` for why it is `tsrange` and not
-- `tstzrange`, and why it is hand-written at all.

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "booking_no_overlap";

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "therapistId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'));
