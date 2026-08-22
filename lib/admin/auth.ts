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

import { readSessionCookie } from "@/lib/admin/session";
import { prisma } from "@/lib/db";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
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

  if (!user || !user.active || !matches) return null;

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { id: user.id, email: user.email, name: user.name };
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
      select: { id: true, email: true, name: true, active: true },
    });

    if (!user || !user.active) return null;

    return { id: user.id, email: user.email, name: user.name };
  },
);

/** For server components. Sends anyone without a live account to the login. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login/");
  return admin;
}
