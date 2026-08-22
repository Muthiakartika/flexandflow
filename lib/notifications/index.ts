/**
 * The notification system's whole public surface.
 *
 * Route handlers and the admin panel import from here and nowhere deeper.
 * Everything below — the SendGrid client, the WAHA client, the templates, the
 * retry policy — is an implementation detail that has already changed once and
 * will again, and a caller that reached past this file would pin it.
 *
 * The division that matters: `queue*` writes rows and returns. It never opens
 * a socket, so nothing SendGrid or WAHA does can fail a customer's booking.
 * `dispatchPending` is what actually sends, and it is called from `after()`
 * once the response is already on its way, then again by cron for whatever did
 * not go through. See BOOKING-PLAN.md §6.1.
 */
import "server-only";

export {
  dispatchPending,
  queueBookingCancelled,
  queueBookingCreated,
  queueBookingRescheduled,
  queueDueReminders,
  sendTestMessages,
  wahaHealth,
} from "@/lib/notifications/jobs";

export type { DeliveryResult } from "@/lib/notifications/jobs";
