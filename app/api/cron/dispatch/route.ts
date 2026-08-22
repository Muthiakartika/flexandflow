/**
 * `/api/cron/dispatch` — send whatever is still waiting in the queue.
 *
 * This is the safety net under every notification in the system. `after()` on
 * the booking routes tries first and usually succeeds; what lands here is what
 * failed because WAHA had logged out, SendGrid rate-limited, or the function
 * was killed before it finished. Retries back off and eventually give up
 * (BOOKING-PLAN.md §6.1) — this endpoint just turns the crank.
 *
 * Both verbs on purpose: Vercel Cron issues a `GET`, and the studio's own VPS —
 * the likely scheduler, since Hobby only allows one cron a day — reaches it
 * with `curl -X POST`. The same guard covers both.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { isAuthorisedCron } from "@/lib/booking/tokens";
import { dispatchPending } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Long enough for a backlog of email and WhatsApp sends, one at a time. */
export const maxDuration = 300;

async function run(request: Request): Promise<Response> {
  /*
   * `ApiError` has no "unauthorised" code because no customer-facing endpoint
   * has any authentication to fail. Rather than widen a type the wizard
   * switches on for the sake of two internal routes, the cron guard borrows
   * NOT_FOUND and overrides the status — an unauthenticated caller learns
   * nothing either way.
   */
  if (!isAuthorisedCron(request)) {
    return fail("NOT_FOUND", "Not authorised.", { status: 401 });
  }

  try {
    return ok(await dispatchPending());
  } catch (error) {
    console.error("[cron] dispatch failed", error);
    return serverError("Dispatch failed.");
  }
}

export const GET = run;
export const POST = run;
