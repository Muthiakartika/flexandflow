/**
 * The gate in front of `/admin`.
 *
 * This is `proxy.ts`, not `middleware.ts` — Next 16 renamed the convention and
 * the exported function with it. A file called `middleware.ts` in this repo
 * would simply never run, silently, which is the worst possible failure for a
 * file whose entire job is authentication.
 *
 * It runs separately from the render code and, per the Next docs, must not
 * lean on shared modules. So it deliberately duplicates the two facts it needs
 * from `lib/admin/session.ts` — the cookie name and the algorithm — instead of
 * importing them, and reads `ADMIN_SESSION_SECRET` straight from
 * `process.env` rather than through `lib/env.ts`, which pulls in `server-only`
 * and Zod. `jose` is the only dependency here; `bcryptjs` and Prisma have no
 * business in this runtime.
 *
 * What it proves is narrow: the cookie carries a signature this deployment
 * made and has not expired. Whether that admin still exists is a database
 * question, answered by `requireAdmin()` on every page, and every server
 * action re-checks the session itself — a matcher change or a refactor that
 * moves an action can quietly remove this file's coverage, and a form that
 * only renders behind a login is not authorisation.
 */
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/** Must match `ADMIN_COOKIE` in `lib/admin/session.ts`. */
const COOKIE = "ff_admin_session";

const LOGIN_PATH = "/admin/login/";

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

async function hasValidSession(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;

  /* No secret configured means no token can have been signed with one, so
     there is nothing to let through. Failing closed here also stops a
     misconfigured deployment from serving the panel to the world. */
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  /* The login page has to be reachable without a session, or the redirect
     below points at itself and the browser gives up after twenty hops. The
     trailing slash is normalised away first: `trailingSlash: true` means the
     served URL carries one, but a direct hit on the bare form reaches here
     before Next's normalising redirect does, and only one of the two shapes
     matching is the same bug. */
  if (pathname.replace(/\/+$/, "") === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;

  if (token && (await hasValidSession(token))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";
  /* Where they were heading, so a bookmarked booking survives the detour. The
     login page only honours values that start with `/admin/`, so this cannot
     be turned into an open redirect. */
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(url);
}
