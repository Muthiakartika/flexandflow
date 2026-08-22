-- Two people pressing Confirm on the same slot in the same second.
--
-- Checking for a clash in application code and then inserting does not prevent
-- this, and no amount of care in the route handler will: between the SELECT and
-- the INSERT there is a window, and under any real concurrency something will
-- eventually land in it. Postgres can enforce the rule itself, so it does.
--
-- `endAt` already includes the service's clean-down buffer (see Booking in
-- schema.prisma), which means the gap between sessions is protected by the same
-- constraint without any code remembering to add it.
--
-- The WHERE clause matters: a cancelled booking must stop holding its slot, and
-- a completed one is in the past and cannot collide with anything new.
--
-- Prisma cannot express an exclusion constraint in the schema language, so this
-- migration is hand-written and must be kept when the schema is regenerated.
--
-- `tsrange`, not `tstzrange`: Prisma maps `DateTime` to `timestamp(3)` — without
-- a time zone — and always writes UTC into it. Wrapping those columns in
-- `tstzrange` would make Postgres insert an implicit `timestamp -> timestamptz`
-- cast, which is STABLE rather than IMMUTABLE because it depends on the session
-- TimeZone. Index expressions must be immutable, so that version does not fail
-- at some subtle later moment; it refuses to create the constraint at all.
-- Comparing the columns in their own type is both correct and immutable.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "therapistId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- Time-off is the other way a slot disappears. The availability engine already
-- filters against it, but an admin blocking out a morning that has since been
-- booked should be told, not silently double-book their own therapist. This
-- index makes the overlap lookup in that check cheap.
CREATE INDEX IF NOT EXISTS "timeoff_range_idx"
  ON "TimeOff" USING gist (tsrange("startAt", "endAt", '[)'));
