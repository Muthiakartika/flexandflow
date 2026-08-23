/**
 * `/api/cron/reminders` — queue tomorrow's reminders, then send them.
 *
 * Queueing and dispatching are separate steps everywhere else in this system,
 * and they are still separate here: `queueDueReminders` only writes rows, and
 * `dispatchPending` only sends them. They are called back to back because a
 * reminder that sits in the queue until the next dispatch run is a reminder
 * that arrives late, and this endpoint runs once a day.
 *
 * Either verb: `POST` is what the GitHub Actions workflow and a `curl` from the
 * studio's own server both send, and `GET` is accepted so a browser can check it.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { isAuthorisedCron } from "@/lib/booking/tokens";
import { dispatchPending, queueDueReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** A day's reminders are queued and sent in one invocation. */
export const maxDuration = 300;

async function run(request: Request): Promise<Response> {
  /* See the note in the dispatch route on why this is NOT_FOUND at 401. */
  if (!isAuthorisedCron(request)) {
    return fail("NOT_FOUND", "Not authorised.", { status: 401 });
  }

  try {
    const queued = await queueDueReminders();
    const dispatched = await dispatchPending();

    return ok({ ...queued, ...dispatched });
  } catch (error) {
    console.error("[cron] reminders failed", error);
    return serverError("Reminder run failed.");
  }
}

export const GET = run;
export const POST = run;
