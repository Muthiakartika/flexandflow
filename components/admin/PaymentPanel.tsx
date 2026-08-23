import { Empty, Panel, TableBox } from "@/components/admin/primitives";
import { RefundForm } from "@/components/admin/RefundForm";
import { PAYMENT_STATE_LABEL } from "@/lib/admin/labels";
import type { BookingPaymentDetail, PaymentState } from "@/lib/admin/queries";
import { formatIdr } from "@/lib/booking/format";
import { formatStudioDateShort, formatStudioTime } from "@/lib/booking/time";
import {
  isSettled,
  PAYMENT_CHANNEL_LABEL,
  PAYMENT_STATUS_LABEL,
  type PaymentStatusValue,
  type PaymentSummary,
} from "@/lib/payments/types";

/**
 * Where the money for one booking stands, and the form for recording that some
 * of it went back.
 *
 * A server component, like the rest of the panel: only the refund form needs
 * JavaScript, and it is the only client component in here.
 *
 * The table lists every charge, not just the one that worked. A customer who
 * let a QRIS code expire and then paid by bank transfer leaves two rows behind,
 * and the studio has to be able to explain both — the expired one is why the
 * confirmation was late, and hiding it makes the panel look like it lost a
 * payment.
 */

// ── Chips ─────────────────────────────────────────────────────────────────

const STATE_STYLE: Record<PaymentState, string> = {
  /* Not a warning: paying at the desk is the normal arrangement here, and
     colouring it amber would light up most of a normal day's agenda. */
  AT_STUDIO: "bg-cream text-muted",
  UNPAID: "bg-warn-soft text-warn",
  PART_PAID: "bg-warn-soft text-warn",
  PAID: "bg-ok-soft text-ok",
  PART_REFUNDED: "bg-danger-soft text-danger",
  REFUNDED: "bg-danger-soft text-danger",
};

/** Where the money for a booking is, for the list and the agenda. */
export function PaymentChip({ state }: { state: PaymentState }) {
  return (
    <span className={`admin-chip ${STATE_STYLE[state]}`}>
      {PAYMENT_STATE_LABEL[state]}
    </span>
  );
}

const PAYMENT_STATUS_STYLE: Record<PaymentStatusValue, string> = {
  PENDING: "bg-warn-soft text-warn",
  PAID: "bg-ok-soft text-ok",
  EXPIRED: "bg-cream text-muted",
  FAILED: "bg-danger-soft text-danger",
  REFUNDED: "bg-danger-soft text-danger",
  PARTIALLY_REFUNDED: "bg-danger-soft text-danger",
};

/** The state of one charge, which is not the same as the booking's. */
export function PaymentStatusChip({ status }: { status: PaymentStatusValue }) {
  return (
    <span className={`admin-chip ${PAYMENT_STATUS_STYLE[status]}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────

function Figure({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.06em] text-faint uppercase">
        {label}
      </p>
      <p
        className={`mt-1 text-[18px] leading-tight font-bold ${
          strong ? "text-danger" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[12px] text-faint">{hint}</p> : null}
    </div>
  );
}

function When({ iso }: { iso: string | null }) {
  if (!iso) return <>—</>;
  const at = new Date(iso);
  return (
    <>
      {formatStudioTime(at)}
      <span className="block text-[12px] text-faint">
        {formatStudioDateShort(at)}
      </span>
    </>
  );
}

function PaymentRow({ payment }: { payment: PaymentSummary }) {
  return (
    <tr>
      <td className="whitespace-nowrap">
        {PAYMENT_CHANNEL_LABEL[payment.channel]}
      </td>
      <td>
        <PaymentStatusChip status={payment.status} />
      </td>
      <td className="whitespace-nowrap">{formatIdr(payment.amountIdr)}</td>
      <td className="whitespace-nowrap">
        {payment.amountPaidIdr > 0 ? formatIdr(payment.amountPaidIdr) : "—"}
        {payment.refundedIdr > 0 ? (
          <span className="block text-[12px] font-bold text-danger">
            −{formatIdr(payment.refundedIdr)} returned
          </span>
        ) : null}
      </td>
      <td className="whitespace-nowrap">
        {/* Paid when it was paid; otherwise when it was raised, said plainly —
            a bare timestamp on an expired charge reads as the moment money
            arrived, which is the one thing it is not. */}
        <When iso={payment.paidAt ?? payment.createdAt} />
        <span className="block text-[12px] text-faint">
          {payment.paidAt ? "paid" : "raised"}
        </span>
      </td>
      <td className="max-w-[280px] text-[13px]">
        {payment.refundNote ? (
          /* `whitespace-pre-line`: a second partial refund appends its own
             line, and running them together would read as one sentence. */
          <span className="block whitespace-pre-line text-muted">
            {payment.refundNote}
          </span>
        ) : null}
        {payment.lastError ? (
          <span className="block text-[12px] text-danger">
            {payment.lastError}
          </span>
        ) : null}
        {!payment.refundNote && !payment.lastError ? "—" : null}
      </td>
    </tr>
  );
}

export function PaymentPanel({ payment }: { payment: BookingPaymentDetail }) {
  const online = payment.method === "ONLINE";
  const netPaid = payment.paidIdr - payment.refundedIdr;
  /* Only the charges that actually took money can be refunded. An expired QRIS
     code has nothing to give back, and offering a form against it would invite
     somebody to transfer money out on the strength of a payment that never
     arrived. */
  const refundable = payment.payments.filter(
    (row) => isSettled(row.status) && row.amountPaidIdr > row.refundedIdr,
  );

  return (
    <>
      <Panel
        title="Payment"
        description={
          online
            ? "Paid online. The gateway is the source of truth for what arrived; everything below is read from our own record of its callbacks."
            : "Paid at the studio. Nothing was collected online — the balance below is what the desk takes in cash or on the card machine."
        }
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Figure
            label="Method"
            value={online ? "Paid online" : "Paid at the studio"}
            hint={
              online && payment.dueOnlineIdr < payment.priceIdr
                ? `${formatIdr(payment.dueOnlineIdr)} was asked for online`
                : undefined
            }
          />
          <Figure
            label="Session price"
            value={formatIdr(payment.priceIdr)}
            hint="As quoted at booking"
          />
          <Figure
            label="Received"
            value={formatIdr(netPaid)}
            hint={
              payment.refundedIdr > 0
                ? `${formatIdr(payment.paidIdr)} in, ${formatIdr(payment.refundedIdr)} returned`
                : undefined
            }
          />
          <Figure
            label={payment.balanceIdr > 0 ? "Still owed" : "Balance"}
            value={formatIdr(Math.abs(payment.balanceIdr))}
            strong={payment.balanceIdr > 0}
            hint={
              payment.balanceIdr > 0
                ? online
                  ? "Collect at the studio"
                  : "Due on arrival"
                : payment.balanceIdr < 0
                  ? "Overpaid — check before refunding"
                  : "Settled"
            }
          />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          {payment.payments.length === 0 ? (
            <Empty>
              {online
                ? "No charge has been raised for this booking yet."
                : "No online charge — this booking is being paid at the studio."}
            </Empty>
          ) : (
            <TableBox>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Channel</th>
                    <th scope="col">Status</th>
                    <th scope="col">Asked for</th>
                    <th scope="col">Arrived</th>
                    <th scope="col">When</th>
                    <th scope="col">Notes and errors</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.payments.map((row) => (
                    <PaymentRow key={row.id} payment={row} />
                  ))}
                </tbody>
              </table>
            </TableBox>
          )}
        </div>
      </Panel>

      {refundable.length > 0 ? (
        <div className="mb-5 grid gap-4">
          {refundable.map((row) => (
            <RefundForm key={row.id} payment={row} />
          ))}
        </div>
      ) : null}
    </>
  );
}
