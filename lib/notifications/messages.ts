/**
 * What the WhatsApp messages actually say.
 *
 * Two registers, on purpose. The customer's messages are in Indonesian —
 * that is who books this studio, and a confirmation nobody reads is a phone
 * call later. The studio's own messages stay in English, like the admin panel
 * and the site. Service and therapist names are never translated: they are
 * what the price list and the wizard showed, and a customer matching a
 * WhatsApp against a booking page should see the same words.
 *
 * Money is `formatRupiah` here and `formatIdr` in email. Both formatters
 * already exist in `lib/booking/format.ts` because the two audiences read
 * money differently — "Rp750.000" on a phone, "IDR 750,000" in an inbox.
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

// ── Customer (Indonesian) ─────────────────────────────────────────────────

export function customerConfirmationMessage(view: BookingView): string {
  return joinLines([
    `*Booking terkonfirmasi* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Layanan: ${view.serviceTitle} (${formatDuration(view.durationMinutes)})`,
    `Terapis: ${view.therapistDisplayName}`,
    `Harga: ${formatRupiah(view.priceIdr)}`,
    `Lokasi: ${contact.address}`,
    ``,
    manageLine(view, `Tambah ke kalender atau ubah jadwal:`),
    ``,
    `Simpan kode ${view.reference} ya. Balas pesan ini kalau ada yang perlu ditanyakan.`,
  ]);
}

export function customerReminderMessage(view: BookingView): string {
  return joinLines([
    `*Pengingat sesi besok* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Layanan: ${view.serviceTitle} (${formatDuration(view.durationMinutes)})`,
    `Terapis: ${view.therapistDisplayName}`,
    `Lokasi: ${contact.address}`,
    ``,
    manageLine(view, `Ubah atau batalkan:`),
  ]);
}

export function customerCancelledMessage(view: BookingView): string {
  const reason = view.cancelReason ? `Alasan: ${view.cancelReason}` : ``;

  return joinLines([
    `*Booking dibatalkan* — ${view.reference}`,
    `${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Layanan: ${view.serviceTitle}`,
    `Terapis: ${view.therapistDisplayName}`,
    reason,
    ``,
    `Tidak ada yang perlu dilakukan lagi. Kalau pembatalan ini di luar dugaan, balas pesan ini.`,
  ]);
}

export function customerRescheduledMessage(view: BookingView): string {
  return joinLines([
    `*Jadwal booking diubah* — ${view.reference}`,
    `Jadwal baru: ${view.dateLabel}, ${view.timeLabel} WITA`,
    ``,
    `Layanan: ${view.serviceTitle} (${formatDuration(view.durationMinutes)})`,
    `Terapis: ${view.therapistDisplayName}`,
    `Lokasi: ${contact.address}`,
    ``,
    manageLine(view, `Perbarui kalender atau ubah lagi:`),
  ]);
}

// ── Studio (English) ──────────────────────────────────────────────────────

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
