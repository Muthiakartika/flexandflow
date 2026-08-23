/**
 * The wire contract between the payment code, the booking API, and the modal.
 *
 * Plain JSON, like `lib/booking/types.ts`: no `Date`, no Prisma models, no
 * Xendit response shapes. Nothing outside `lib/payments/` should ever see a
 * field named `external_id` — swapping Xendit for another gateway must not
 * reach the wizard, and this file is the seam that guarantees it.
 *
 * Safe to import from client components.
 */

export type PaymentMethodValue = "AT_STUDIO" | "ONLINE";

export type PaymentStatusValue =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

/**
 * Which rail the money travels on.
 *
 * Recorded on every charge because each one costs the studio a different
 * amount — see PAYMENT-PLAN.md §1, where the whole point is that a virtual
 * account keeps roughly six times more of a Rp750,000 booking than a card does.
 */
export type PaymentChannelValue =
  | "QRIS"
  | "VIRTUAL_ACCOUNT"
  | "CARD"
  | "EWALLET";

/**
 * Presented in the order the studio would rather be paid in.
 *
 * The cheap rails come first on purpose. Cards stay on the list — a visitor
 * with nothing but a Visa has to be able to book — but they are last, because
 * whichever option is at the top is the one most people take.
 */
export const PAYMENT_CHANNELS: readonly PaymentChannelValue[] = [
  "QRIS",
  "VIRTUAL_ACCOUNT",
  "EWALLET",
  "CARD",
] as const;

export const PAYMENT_CHANNEL_LABEL: Record<PaymentChannelValue, string> = {
  QRIS: "QRIS",
  VIRTUAL_ACCOUNT: "Bank transfer",
  EWALLET: "E-wallet",
  CARD: "Card",
};

export const PAYMENT_CHANNEL_NOTE: Record<PaymentChannelValue, string> = {
  QRIS: "Scan with any Indonesian banking or e-wallet app",
  VIRTUAL_ACCOUNT: "Transfer to a virtual account number",
  EWALLET: "OVO, DANA, ShopeePay or LinkAja",
  CARD: "Visa, Mastercard or JCB",
};

/** One virtual account Xendit opened for a charge. */
export type VirtualAccount = {
  /** Bank code as the gateway names it, e.g. `BCA`, `BNI`, `MANDIRI`. */
  bank: string;
  accountNumber: string;
};

/**
 * Everything the modal needs to collect a payment without leaving the page.
 *
 * `qrString` and `virtualAccounts` are what make the modal possible at all —
 * they are rendered by our own UI. `checkoutUrl` is the escape hatch: the card
 * path uses it because 3-D Secure belongs to the issuing bank and cannot be
 * drawn by us, and any channel can fall back to it.
 */
/**
 * What a pay-now booking comes back with before any rail has been picked.
 *
 * Not a charge — no `Payment` row exists yet. Creating one at booking time
 * meant every customer who opened the modal had a QRIS code raised for them
 * whether or not they wanted QRIS, and picking anything else left that row
 * behind, unpaid and unpayable, in the studio's payment table.
 */
export type PaymentDue = {
  amountIdr: number;
  /** UTC ISO. When the slot stops being held, charge or no charge. */
  holdExpiresAt: string;
};

export type PaymentIntent = {
  paymentId: string;
  channel: PaymentChannelValue;
  amountIdr: number;
  /** UTC ISO. When the charge stops being payable. */
  expiresAt: string;

  /** QRIS payload, to be drawn as a QR code client-side. */
  qrString: string | null;
  virtualAccounts: VirtualAccount[];
  /** Xendit's own hosted page. Always present for CARD. */
  checkoutUrl: string | null;
  /**
   * Deep links into wallet apps, keyed by wallet. The QR is useless to someone
   * booking on the same phone they would scan with, which is most of this
   * studio's customers — see PAYMENT-PLAN.md §4.
   */
  deepLinks: Record<string, string>;
};

/**
 * What the modal polls for.
 *
 * Read from our own database, never proxied from the gateway: the callback is
 * what writes the truth, and this only reads it. A browser telling the server
 * that a payment succeeded is not evidence of anything.
 */
export type PaymentStatusView = {
  paymentId: string;
  status: PaymentStatusValue;
  channel: PaymentChannelValue;
  amountIdr: number;
  amountPaidIdr: number;
  expiresAt: string | null;
  paidAt: string | null;

  /** So the modal knows when it may leave, without a second request. */
  bookingStatus: string;
  bookingReference: string;
};

/** A charge as the admin panel lists it. */
export type PaymentSummary = {
  id: string;
  channel: PaymentChannelValue;
  status: PaymentStatusValue;
  amountIdr: number;
  amountPaidIdr: number;
  refundedIdr: number;
  refundedAt: string | null;
  refundNote: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  lastError: string | null;
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatusValue, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  EXPIRED: "Expired",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

/** Money has arrived and has not been given back. */
export function isSettled(status: PaymentStatusValue): boolean {
  return status === "PAID" || status === "PARTIALLY_REFUNDED";
}

/** No more money will arrive on this charge; the modal can stop polling. */
export function isFinished(status: PaymentStatusValue): boolean {
  return status !== "PENDING";
}
