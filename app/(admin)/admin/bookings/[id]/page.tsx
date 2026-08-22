import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingActions } from "@/components/admin/BookingActions";
import {
  Empty,
  JobChip,
  PageHeading,
  Panel,
  StatusChip,
  TableBox,
} from "@/components/admin/primitives";
import { requireAdmin } from "@/lib/admin/auth";
import { listTherapistOptions, loadBookingDetail } from "@/lib/admin/queries";
import {
  formatDuration,
  formatIdr,
  formatPhoneDisplay,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import {
  formatMinuteOfDay,
  formatStudioDate,
  formatStudioTime,
  minuteOfDay,
  studioDateKey,
} from "@/lib/booking/time";
import { TIER_LABEL } from "@/lib/booking/types";

export const metadata: Metadata = {
  title: "Booking",
};

/** Job kinds are enum names; this is how they read to a person. */
const KIND_LABEL: Record<string, string> = {
  CUSTOMER_CONFIRMATION: "Customer confirmation",
  ADMIN_NEW_BOOKING: "New booking (admin)",
  CUSTOMER_REMINDER: "Customer reminder",
  CUSTOMER_CANCELLED: "Cancellation (customer)",
  ADMIN_CANCELLED: "Cancellation (admin)",
  CUSTOMER_RESCHEDULED: "Reschedule (customer)",
  ADMIN_RESCHEDULED: "Reschedule (admin)",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0 border-b border-line/60 py-2 last:border-b-0">
      <dt className="w-[140px] shrink-0 text-[12px] font-bold tracking-[0.04em] text-faint uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[14px] text-ink">{children}</dd>
    </div>
  );
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const [detail, therapists] = await Promise.all([
    loadBookingDetail(id),
    listTherapistOptions(),
  ]);

  if (!detail) notFound();

  const { view, jobs, audit } = detail;
  const start = new Date(view.startAt);
  const end = new Date(view.endAt);

  return (
    <>
      <PageHeading
        title={view.reference}
        lede={`${formatStudioDate(start)} · ${formatStudioTime(start)} – ${formatStudioTime(end)} (WITA)`}
        actions={
          <Link href="/admin/bookings/" className="admin-btn admin-btn-quiet">
            ← All bookings
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Panel title="The booking">
          <dl>
            <Row label="Status">
              <StatusChip status={view.status} />
            </Row>
            <Row label="Service">
              {view.serviceTitle} · {formatDuration(view.durationMinutes)}
            </Row>
            <Row label="Therapist">
              {view.therapistDisplayName} ({TIER_LABEL[view.tier]})
            </Row>
            <Row label="Price">
              {formatIdr(view.priceIdr)}
              <span className="ml-2 text-[12px] text-faint">
                as quoted at booking
              </span>
            </Row>
            <Row label="Booked">{formatStudioDate(new Date(view.createdAt))}</Row>
            {view.cancelledAt ? (
              <Row label="Cancelled">
                {formatStudioDate(new Date(view.cancelledAt))}
                {view.cancelReason ? ` — ${view.cancelReason}` : ""}
              </Row>
            ) : null}
            <Row label="Manage link">
              {/* The customer's own link, so an admin can send it again when
                  the confirmation never arrived. It is HMAC-signed and does
                  not expire. */}
              <a
                href={view.manageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold break-all text-olive-strong underline underline-offset-2"
              >
                {view.manageUrl}
              </a>
            </Row>
          </dl>
        </Panel>

        <Panel title="The customer">
          <dl>
            <Row label="Name">
              {fullName(view.customer.firstName, view.customer.lastName)}
            </Row>
            <Row label="WhatsApp">
              <a
                href={whatsappLink(view.customer.phoneE164)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-olive-strong underline underline-offset-2"
              >
                {formatPhoneDisplay(view.customer.phoneE164)}
              </a>
            </Row>
            <Row label="Email">
              {view.customer.email ? (
                <a
                  href={`mailto:${view.customer.email}`}
                  className="break-all text-olive-strong underline underline-offset-2"
                >
                  {view.customer.email}
                </a>
              ) : (
                <span className="text-faint">
                  None given — WhatsApp is the only way to reach them
                </span>
              )}
            </Row>
            <Row label="Note">
              {view.customer.note ?? <span className="text-faint">—</span>}
            </Row>
          </dl>
        </Panel>
      </div>

      <BookingActions
        bookingId={view.id}
        status={view.status}
        therapists={therapists}
        therapistId={detail.therapistId}
        defaultDate={studioDateKey(start)}
        defaultTime={formatMinuteOfDay(minuteOfDay(start))}
      />

      <div className="mt-5">
        <Panel
          title="Messages"
          description="What this booking has tried to send. When a customer says they heard nothing, the answer is on this table — an attempt count and an error, or no row at all."
        >
          {jobs.length === 0 ? (
            <Empty>No messages have been queued for this booking.</Empty>
          ) : (
            <TableBox>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Message</th>
                    <th scope="col">Channel</th>
                    <th scope="col">To</th>
                    <th scope="col">Status</th>
                    <th scope="col">Tries</th>
                    <th scope="col">Due</th>
                    <th scope="col">Sent</th>
                    <th scope="col">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{KIND_LABEL[job.kind] ?? job.kind}</td>
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
                          {formatStudioDate(job.scheduledAt).replace(
                            /^\w+\s/,
                            "",
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {job.sentAt ? formatStudioTime(job.sentAt) : "—"}
                      </td>
                      <td className="max-w-[280px] text-[12px] text-danger">
                        {job.lastError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableBox>
          )}
        </Panel>
      </div>

      <Panel title="History">
        {audit.length === 0 ? (
          <Empty>Nothing has been changed since this was booked.</Empty>
        ) : (
          <ul className="text-[13px]">
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap gap-x-3 border-b border-line/60 py-2 last:border-b-0"
              >
                <span className="font-bold text-ink">{entry.action}</span>
                <span className="text-muted">{entry.actor}</span>
                <span className="text-faint">
                  {formatStudioDate(entry.createdAt)},{" "}
                  {formatStudioTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
