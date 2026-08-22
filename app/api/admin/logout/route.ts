import { NextResponse, type NextRequest } from "next/server";

import { clearSessionCookie } from "@/lib/admin/session";

/**
 * Signing out.
 *
 * POST only. A `GET /api/admin/logout/` would be followed by any link
 * preloader, any crawler, and any `<img>` tag on a page the admin happens to
 * be reading, logging them out at random — the classic reason logout is not a
 * safe method.
 *
 * There is no session table to delete from: the cookie *is* the session, so
 * clearing it is the whole operation. The token stays technically valid until
 * it expires, which is the trade the stateless design makes; revoking an
 * account before then is `AdminUser.active = false`, which `requireAdmin()`
 * re-reads on every page.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  await clearSessionCookie();

  /* 303, not 307: the browser must follow this with a GET. A 307 would repeat
     the POST against the login page. */
  return NextResponse.redirect(new URL("/admin/login/", request.url), 303);
}
