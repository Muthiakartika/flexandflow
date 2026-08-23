/**
 * What the WhatsApp messages actually say.
 *
 * English throughout, customer and studio alike — the owner's call, and it
 * matches the rest: the site, the wizard, the emails and the admin panel are
 * all in English, and a confirmation that arrives in a different language from
 * the page that produced it reads as though it came from somewhere else.
 * Uluwatu's booking traffic is largely visitors, which is the same reason.
 *
 * Service and therapist names are never translated: they are what the price
 * list and the wizard showed, and a customer matching a WhatsApp against a
 * booking page should see the same words.
 *
 * Money is `formatRupiah` here and `formatIdr` in email — "Rp750.000" on a
 * phone, "IDR 750,000" in an inbox. Both formatters already exist in
 * `lib/booking/format.ts`; the rupiah form stays because it is how the amount
 * is written on a receipt in Bali, whatever language surrounds it.
 *
 * WhatsApp's own markup is `*bold*` and `_italic_`. Nothing else survives.
 * The reference and the time go in the first two lines so the whole message
 * is legible from a notification preview without opening the app.
 */
import "server-only";

import {
  formatDuration,
  formatPhoneDisplay,
  formatRupiah,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import type { BookingView } from "@/lib/booking/types";
import { contact } from "@/lib/site";

/**
 * One link, not three.
 *
 * The manage page already carries "Add to Google Calendar" and the `.ics`
 * download. A Google Calendar template URL is several hundred characters of
 * percent-encoding and pushes everything readable out of the notification
 * preview, so WhatsApp links to the page that holds the buttons instead.
 */
function manageLine(view: BookingView, label: string): string {
  return `${label}\n${view.manageUrl}`;
}

function joinLines(lines: string[]): string {
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Customer ──────────────────────────────────────────────────────────────

export function customerConfirmationMessage(view: BookingView): string {
  return joinLines([
    `*Booking confirmed* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Treatment: ${view.serviceTitle} (${formatDuration(view.durationMinutes)})`,
    `Therapist: ${view.therapistDisplayName}`,
    `Price: ${formatRupiah(view.priceIdr)}`,
    `Where: ${contact.address}`,
    ``,
    manageLine(view, `Add to your calendar, or change the time:`),
    ``,
    `Keep the code ${view.reference}. Reply here if you need anything.`,
  ]);
}

export function customerReminderMessage(view: BookingView): string {
  return joinLines([
    `*Your session is tomorrow* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Treatment: ${view.serviceTitle} (${formatDuration(view.durationMinutes)})`,
    `Therapist: ${view.therapistDisplayName}`,
    `Where: ${contact.address}`,
    ``,
    manageLine(view, `Change or cancel:`),
  ]);
}

export function customerCancelledMessage(view: BookingView): string {
  const reason = view.cancelReason ? `Reason: ${view.cancelReason}` : ``;

  return joinLines([
    `*Booking cancelled* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Treatment: ${view.serviceTitle}`,
    `Therapist: ${view.therapistDisplayName}`,
    reason,
    ``,
    `Nothing further to do. If this cancellation is a surprise, reply here.`,
  ]);
}

export function customerRescheduledMessage(view: BookingView): string {
  return joinLines([
    `*Your booking has moved* — ${view.reference}`,
    `New time: ${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Treatment: ${view.serviceTitle} (${formatDuration(view.durationMinutes)})`,
    `Therapist: ${view.therapistDisplayName}`,
    `Where: ${contact.address}`,
    ``,
    manageLine(view, `Update your calendar, or change it again:`),
  ]);
}

// ── Studio ────────────────────────────────────────────────────────────────

/** The customer's number as something the studio can tap to reply. */
function replyLine(view: BookingView): string {
  return `Reply: ${whatsappLink(view.customer.phoneE164)}`;
}

export function adminNewBookingMessage(view: BookingView): string {
  return joinLines([
    `*New booking* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `${view.serviceTitle} (${formatDuration(view.durationMinutes)}) · ${formatRupiah(view.priceIdr)}`,
    `Therapist: ${view.therapistDisplayName}`,
    `Customer: ${fullName(view.customer.firstName, view.customer.lastName)} · ${formatPhoneDisplay(view.customer.phoneE164)}`,
    view.customer.note ? `Note: ${view.customer.note}` : ``,
    ``,
    replyLine(view),
  ]);
}

export function adminCancelledMessage(view: BookingView): string {
  const reason = view.cancelReason ? `Reason: ${view.cancelReason}` : ``;

  return joinLines([
    `*Booking cancelled* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `${view.serviceTitle} · ${view.therapistDisplayName}`,
    `Customer: ${fullName(view.customer.firstName, view.customer.lastName)} · ${formatPhoneDisplay(view.customer.phoneE164)}`,
    reason,
    ``,
    `The slot is free again.`,
  ]);
}

export function adminRescheduledMessage(view: BookingView): string {
  return joinLines([
    `*Booking moved* — ${view.reference}`,
    `New time: ${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `${view.serviceTitle} (${formatDuration(view.durationMinutes)}) · ${view.therapistDisplayName}`,
    `Customer: ${fullName(view.customer.firstName, view.customer.lastName)} · ${formatPhoneDisplay(view.customer.phoneE164)}`,
    ``,
    replyLine(view),
  ]);
}

/** What `sendTestMessages` puts on the wire. Never sent to a customer. */
export function testMessage(): string {
  return joinLines([
    `*Flex & Flow* — test message`,
    `Sent from the booking system to check that WhatsApp delivery works.`,
    ``,
    `No action needed.`,
  ]);
}
