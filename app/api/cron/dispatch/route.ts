/**
 * `/api/cron/dispatch` — send whatever is still waiting in the queue.
 *
 * This is the safety net under every notification in the system. `after()` on
 * the booking routes tries first and usually succeeds; what lands here is what
 * failed because WAHA had logged out, SendGrid rate-limited, or the function
 * was killed before it finished. Retries back off and eventually give up
 * (BOOKING-PLAN.md §6.1) — this endpoint just turns the crank.
 *
 * It also sweeps expired payment holds, which is the only thing in the system
 * that releases a slot somebody walked away from mid-payment. Same crank, one
 * more job on it.
 *
 * Both verbs on purpose: a scheduler may issue either. GitHub Actions posts, and
 * the studio's own VPS —
 * the likely scheduler, since Hobby only allows one cron a day — reaches it
 * with `curl -X POST`. The same guard covers both.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { isAuthorisedCron } from "@/lib/booking/tokens";
import { sweepExpiredHolds } from "@/lib/booking/transitions";
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
    /*
     * First, because this is how an abandoned payment gives its slot back and
     * nobody has to do anything for that to happen. Somebody who opens the
     * payment modal and closes the tab leaves an `AWAITING_PAYMENT` booking
     * holding a Saturday evening; no callback is coming, and nothing else in
     * the system is watching. This sweep is the whole of that mechanism.
     *
     * It runs before the dispatch so any cancellation it queues goes out on
     * this same pass rather than waiting for the next one.
     */
    const holds = await sweepExpiredHolds();

    return ok({ ...(await dispatchPending()), expiredHolds: holds.expired });
  } catch (error) {
    console.error("[cron] dispatch failed", error);
    return serverError("Dispatch failed.");
  }
}

export const GET = run;
export const POST = run;
