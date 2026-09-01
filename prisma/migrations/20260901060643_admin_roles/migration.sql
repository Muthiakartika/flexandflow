-- Roles and per-user permission grants for the admin panel.
--
-- The `UPDATE` at the bottom is the whole point of this file and is not
-- something `prisma migrate dev` can generate. Read it before changing
-- anything here.

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'EDITOR');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "extraPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AdminUser_deletedAt_active_idx" ON "AdminUser"("deletedAt", "active");

-- Everyone who already had an account was, by definition, unrestricted: there
-- was no role column, so every existing admin could do everything the panel
-- offered. `EDITOR` is the right default for accounts created from now on, but
-- applying it to the rows already here would silently demote the studio owner
-- and lock them out of the very page that grants the role back — leaving a
-- database console as the only way to recover the panel.
--
-- So the default is for the future and this statement is for the past. It runs
-- once, against the accounts that predate the column, and matches nothing on a
-- fresh database.
UPDATE "AdminUser" SET "role" = 'SUPER_ADMIN';
