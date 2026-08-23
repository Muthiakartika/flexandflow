/**
 * The word the panel prints for a status, in one place.
 *
 * The chips on screen and the CSV export have to agree. An owner who filters
 * the list to "No show", downloads it, and finds "NO_SHOW" in the spreadsheet
 * has two vocabularies to reconcile before they can add anything up — and a
 * label renamed in one place and not the other is invisible until someone is
 * reading the accounts. Only the wording lives here; the chip colours stay
 * with the chips, which are the only thing that needs them.
 */
import type { PaymentState } from "@/lib/admin/queries";
import type { BookingStatusValue } from "@/lib/booking/types";
import type { PaymentMethodValue } from "@/lib/payments/types";

export const BOOKING_STATUS_LABEL: Record<BookingStatusValue, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  AT_STUDIO: "At studio",
  UNPAID: "Unpaid",
  PART_PAID: "Part paid",
  PAID: "Paid",
  PART_REFUNDED: "Part refunded",
  REFUNDED: "Refunded",
};

/** How the booking was *meant* to be paid, which is not where the money is. */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethodValue, string> = {
  AT_STUDIO: "At studio",
  ONLINE: "Online",
};
