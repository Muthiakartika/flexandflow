/**
 * The admin session: a signed JWT in an httpOnly cookie, and nothing else.
 *
 * There is no session table. The panel has two or three users and the only
 * thing a session has to answer is "which AdminUser is this", so a signed
 * token answers it without a database round trip on every request — which
 * matters because `proxy.ts` checks the same cookie on every `/admin` request
 * and cannot reach Postgres from where it runs.
 *
 * The eight-hour lifetime is a working day. Longer and a laptop left open at
 * the studio stays logged in overnight; shorter and the owner is typing a
 * password between clients.
 *
 * `proxy.ts` deliberately re-implements the verify half of this file rather
 * than importing it. It runs in a constrained runtime where `next/headers`
 * and `server-only` do not belong, and the docs warn against sharing modules
 * with render code. If the cookie name or the algorithm changes here, it has
 * to change there too — the comment in `proxy.ts` says so.
 */
import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/** Kept in step with the literal in `proxy.ts`. */
export const ADMIN_COOKIE = "ff_admin_session";

export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const ALGORITHM = "HS256";

export type AdminSession = {
  adminId: string;
  email: string;
  name: string;
};

function signingKey(): Uint8Array {
  return new TextEncoder().encode(env().ADMIN_SESSION_SECRET);
}

export async function createSessionToken(
  session: AdminSession,
): Promise<string> {
  return new SignJWT({ email: session.email, name: session.name })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(session.adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(signingKey());
}

/**
 * The session a token vouches for, or null.
 *
 * Every failure — bad signature, expired, malformed, wrong algorithm — comes
 * back as the same null. There is nothing useful the panel could do with the
 * distinction, and nothing safe it could tell the browser about it.
 */
export async function verifySessionToken(
  token: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: [ALGORITHM],
    });

    const adminId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    if (
      typeof adminId !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string"
    ) {
      return null;
    }

    return { adminId, email, name };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();

  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    /* `lax` rather than `strict`: the login redirect and the logout route are
       both top-level navigations, and `strict` would drop the cookie on the
       first of them and bounce the admin straight back to the login form. */
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function readSessionCookie(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();

  /* Overwritten with an expired empty value rather than deleted, because a
     `Set-Cookie` with the same attributes is the only form every browser
     agrees to act on. */
  store.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
