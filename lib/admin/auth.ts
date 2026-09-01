/**
 * Who is logged in, and whether a password is right.
 *
 * `requireAdmin()` is the gate every admin page opens with. `proxy.ts` already
 * turned anonymous requests away, but that check only proves the cookie is
 * signed — it cannot know the account was deactivated or deleted since the
 * token was issued. This file re-reads the row, so revoking an admin takes
 * effect on their next page load rather than in eight hours.
 */
import "server-only";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  hasPermission,
  permissionsFor,
  type AdminRoleValue,
  type Permission,
} from "@/lib/admin/permissions";
import { readSessionCookie } from "@/lib/admin/session";
import { prisma } from "@/lib/db";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: AdminRoleValue;
  /**
   * The role's defaults plus this account's own grants, already resolved.
   *
   * Resolved here rather than at each call site so there is one answer to
   * "what may this person do", and so it can be handed to a client component
   * as plain strings without that component needing the role table.
   */
  permissions: Permission[];
};

/**
 * A real bcrypt hash of a string nobody knows, compared against when the email
 * matches no account.
 *
 * Without it, an unknown email returns in microseconds and a known one takes
 * the ~100ms bcrypt costs, which is enough of a difference to enumerate every
 * admin address from the outside. Failing both cases through the same work,
 * and reporting both with the same message, leaves nothing to measure and
 * nothing to read.
 */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.KI1bkYnkxKfKcJVYqrDSKfVYnQIbF1O";

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AdminIdentity | null> {
  const user = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  const hash = user?.passwordHash ?? DUMMY_HASH;
  const matches = await compare(password, hash);

  /* `deletedAt` is checked alongside `active` everywhere an account is read.
     A soft-deleted row keeps its email — that is what makes the unique index
     still meaningful and the audit trail still resolvable — so without this it
     would remain a working login. */
  if (!user || !user.active || user.deletedAt || !matches) return null;

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: permissionsFor(user.role, user.extraPermissions),
  };
}

/**
 * The signed-in admin, or null.
 *
 * Server actions use this rather than `requireAdmin()`: a redirect thrown out
 * of an action that a `useActionState` form is awaiting produces a navigation
 * the form cannot explain, where returning an error state can say "your
 * session expired, sign in again".
 *
 * `cache`d for the request: the layout asks who is signed in to draw the
 * header, and then the page asks again to gate itself. That is one query, not
 * two.
 */
export const currentAdmin = cache(
  async (): Promise<AdminIdentity | null> => {
    const session = await readSessionCookie();
    if (!session) return null;

    const user = await prisma.adminUser.findUnique({
      where: { id: session.adminId },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        deletedAt: true,
        role: true,
        extraPermissions: true,
      },
    });

    if (!user || !user.active || user.deletedAt) return null;

    /* Permissions are read from the row on every request, never from the JWT.
       A token that outlived a revocation is exactly the failure this file
       exists to avoid: taking `content.publish` away from someone has to bite
       on their next page load, not in eight hours when their session lapses. */
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: permissionsFor(user.role, user.extraPermissions),
    };
  },
);

/** For server components. Sends anyone without a live account to the login. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login/");
  return admin;
}

export function can(
  admin: AdminIdentity | null,
  permission: Permission,
): boolean {
  return admin ? hasPermission(admin.permissions, permission) : false;
}

/**
 * For server components that belong to one capability.
 *
 * Signed out goes to the login; signed in but not allowed goes to the panel's
 * home rather than to a 403. There is no useful page to show someone who
 * followed a link to a section they do not have, and a bare "Forbidden" in a
 * two-person studio reads as a bug rather than as a policy.
 */
export async function requirePermission(
  permission: Permission,
): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (!can(admin, permission)) redirect("/admin/");
  return admin;
}

/**
 * For server actions.
 *
 * Returns the admin or `null`, and never redirects: a redirect thrown out of
 * an action a `useActionState` form is awaiting produces a navigation the form
 * cannot explain, where a returned error state can say what happened. The
 * caller turns `null` into that message.
 *
 * Every action calls this. `proxy.ts` does not reliably cover server actions —
 * they are public HTTP endpoints that happen to be reachable by a form — and a
 * form that only renders behind a permission check is not authorisation.
 */
export async function actingAdmin(
  permission: Permission,
): Promise<AdminIdentity | null> {
  const admin = await currentAdmin();
  return admin && can(admin, permission) ? admin : null;
}
