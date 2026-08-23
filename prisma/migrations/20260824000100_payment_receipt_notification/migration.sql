-- The receipt sent once a payment settles, alongside the booking confirmation.
--
-- On its own in a migration because `ALTER TYPE … ADD VALUE` cannot be *used*
-- in the transaction that adds it, and Prisma runs each migration in one. This
-- migration only declares the value; the first row to carry it is written at
-- runtime, in a later transaction, so nothing here trips over that rule. The
-- same constraint is why `AWAITING_PAYMENT` needed two migrations.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'CUSTOMER_PAYMENT_RECEIVED';
