import type { Metadata } from "next";
import Link from "next/link";

import {
  Empty,
  JobChip,
  PageHeading,
  Panel,
  Stat,
  TableBox,
} from "@/components/admin/primitives";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { refreshWahaAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { loadNotificationHealth } from "@/lib/admin/queries";
import { formatStudioDate, formatStudioTime } from "@/lib/booking/time";
import { env } from "@/lib/env";
import { wahaHealth } from "@/lib/notifications";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * The notification plumbing, and nothing else.
 *
 * Nothing on this page renders a credential. `WAHA_API_KEY`,
 * `SENDGRID_API_KEY`, `ADMIN_SESSION_SECRET` and `BOOKING_TOKEN_SECRET` are
 * never printed, never masked-and-printed, and never put in a data attribute:
 * an admin panel is exactly where a screenshot gets taken and pasted into a
 * chat. The session name is the one setting shown, because it is what somebody
 * needs to re-scan the right QR code.
 */
export default async function AdminSettingsPage() {
  await requireAdmin();

  const health = await wahaHealth().catch((error: unknown) => ({
    ok: false,
    status: "UNREACHABLE",
    detail: error instanceof Error ? error.message : String(error),
  }));

  const notifications = await loadNotificationHealth();

  return (
    <>
      <PageHeading
        title="Settings"
        lede="WhatsApp session, test sends, and the messages that did not go out."
      />

      <Panel
        title="WhatsApp session"
        description="A WAHA session that has quietly logged out is the most likely failure of this whole system, and nothing else in the product would say so."
      >
        <div
          className={`rounded-[8px] border p-4 ${
            health.ok
              ? "border-ok/40 bg-ok-soft"
              : "border-danger bg-danger-soft"
          }`}
          role={health.ok ? undefined : "alert"}
        >
          <p
            className={`text-[18px] font-bold ${
              health.ok ? "text-ok" : "text-danger"
            }`}
          >
            {health.status}
          </p>
          <p className="mt-1 text-[13px] text-ink">
            {health.ok
              ? "The session is connected. Confirmations and reminders are going out."
              : "Not sending. Re-scan the QR code on the WAHA server, then run the queue below."}
          </p>
          {health.detail ? (
            <p className="mt-1 text-[12px] break-words text-muted">
              {health.detail}
            </p>
          ) : null}
          <p className="mt-2 text-[12px] text-faint">
            Session name: <code>{env().WAHA_SESSION}</code>
          </p>
        </div>

        <form action={refreshWahaAction} className="mt-3">
          <button type="submit" className="admin-btn admin-btn-quiet">
            Check again
          </button>
        </form>
      </Panel>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={String(notifications.pending)} />
        <Stat
          label="Failed"
          value={String(notifications.failed)}
          hint="Will be retried"
        />
        <Stat
          label="Given up"
          value={String(notifications.dead)}
          hint="Needs a person"
        />
      </div>

      <div className="mb-5">
        <SettingsPanel pending={notifications.pending} />
      </div>

      <Panel
        title="Messages that did not go out"
        description="Newest first. A DEAD row will never be retried — the number has no WhatsApp account, or the retry budget ran out."
      >
        {notifications.trouble.length === 0 ? (
          <Empty>Nothing has failed. Every queued message went out.</Empty>
        ) : (
          <TableBox>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Booking</th>
                  <th scope="col">Message</th>
                  <th scope="col">Channel</th>
                  <th scope="col">To</th>
                  <th scope="col">Status</th>
                  <th scope="col">Tries</th>
                  <th scope="col">Due</th>
                  <th scope="col">Last error</th>
                </tr>
              </thead>
              <tbody>
                {notifications.trouble.map((job) => (
                  <tr key={job.id}>
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/admin/bookings/${job.bookingId}/`}
                        className="font-bold text-olive-strong underline underline-offset-2"
                      >
                        {job.reference}
                      </Link>
                    </td>
                    <td>{job.kind.toLowerCase().replaceAll("_", " ")}</td>
                    <td className="whitespace-nowrap">
                      {job.channel === "WHATSAPP" ? "WhatsApp" : "Email"}
                    </td>
                    <td className="break-all">{job.target}</td>
                    <td>
                      <JobChip status={job.status} />
                    </td>
                    <td>{job.attempts}</td>
                    <td className="whitespace-nowrap">
                      {formatStudioTime(job.scheduledAt)}
                      <span className="block text-[12px] text-faint">
                        {formatStudioDate(job.scheduledAt).replace(/^\w+\s/, "")}
                      </span>
                    </td>
                    <td className="max-w-[320px] text-[12px] text-danger">
                      {job.lastError ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        )}
      </Panel>

      <Panel title="Where the rest of the settings live">
        <p className="text-[13px] text-muted">
          Everything else — the WAHA URL and key, SendGrid, the booking lead
          time, the cancellation cutoff — is environment configuration, changed
          on the host and not from a web form. Nothing on this page will ever
          print a key: this is the screen people screenshot.
        </p>
      </Panel>
    </>
  );
}
