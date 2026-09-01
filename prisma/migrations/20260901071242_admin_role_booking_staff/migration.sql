-- A third admin role: the studio diary, without the website.
--
-- Only the enum value is added here, and deliberately nothing uses it in this
-- migration. Postgres refuses to *use* a value added by `ALTER TYPE … ADD
-- VALUE` inside the same transaction, and Prisma runs each migration in one —
-- the same constraint that split the two payment migrations. Assigning the
-- role happens at runtime, so there is nothing else to do here.

-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE 'BOOKING_STAFF';
