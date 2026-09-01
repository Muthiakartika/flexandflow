/**
 * Reading admin accounts, and the two guards that keep the panel usable.
 *
 * The guards are the reason this file exists rather than the queries being
 * inlined into the actions. Both failure modes they prevent end the same way —
 * with somebody in a database console at an awkward hour — and neither is
 * hypothetical:
 *
 * 1. **Locking yourself out.** The account you are signed in as is the one you
 *    are most likely to be editing when you click the wrong button.
 * 2. **Stranding the panel.** Demoting, deactivating or deleting the *last*
 *    active super admin leaves an installation where nobody can grant the role
 *    back, because granting it needs the role.
 */
import "server-only";

import { prisma } from "@/lib/db";
import {
  wouldStrand,
  type AdminRoleValue,
  type Permission,
} from "@/lib/admin/permissions";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRoleValue;
  extraPermissions: Permission[];
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
};

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  extraPermissions: true,
  active: true,
  deletedAt: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

function shape(row: {
  id: string;
  name: string;
  email: string;
  role: AdminRoleValue;
  extraPermissions: string[];
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}): TeamMember {
  return { ...row, extraPermissions: row.extraPermissions as Permission[] };
}

/**
 * Everyone, soft-deleted accounts last.
 *
 * Deleted rows are listed rather than hidden: an account that authored a
 * published article still appears as its author, and a list that pretends it
 * never existed makes that byline unexplainable.
 */
export async function listAdmins(): Promise<TeamMember[]> {
  const rows = await prisma.adminUser.findMany({
    select: SELECT,
    orderBy: [{ deletedAt: "asc" }, { role: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(shape);
}

export async function getAdmin(id: string): Promise<TeamMember | null> {
  const row = await prisma.adminUser.findUnique({ where: { id }, select: SELECT });
  return row ? shape(row) : null;
}

/** Super admins who can currently sign in. */
export async function countActiveSuperAdmins(): Promise<number> {
  return prisma.adminUser.count({
    where: { role: "SUPER_ADMIN", active: true, deletedAt: null },
  });
}

/**
 * Whether a change to `target` would leave nobody able to administer the panel.
 *
 * The rule itself is `wouldStrand` in `lib/admin/permissions.ts`, which is
 * pure and takes the count — this only supplies it. Splitting them is what
 * lets `scripts/check-permissions.ts` prove the rule without a database, and
 * keeps the query out of the logic that is easy to get subtly wrong.
 */
export async function wouldStrandPanel(
  target: TeamMember,
  next: { role?: AdminRoleValue; active?: boolean; deleted?: boolean },
): Promise<boolean> {
  return wouldStrand(
    {
      role: target.role,
      active: target.active,
      deleted: Boolean(target.deletedAt),
    },
    await countActiveSuperAdmins(),
    next,
  );
}

/**
 * Whether this account has authored anything, which decides whether removing
 * it is a soft delete or a real one.
 *
 * Written now, before the content tables exist, so Phase 4 has one place to
 * add the revision count to rather than a guard to remember to write. Until
 * then nothing is authored and every delete is a hard one.
 */
export async function hasAuthoredContent(_id: string): Promise<boolean> {
  /* TODO(cms-phase-4): count ContentRevision rows authored by this admin. */
  return false;
}
