/**
 * "Add to calendar" links.
 *
 * The `.ics` file is the real mechanism — it is what iOS and Android hand to
 * the built-in calendar when someone taps the attachment in their confirmation
 * email. These links are the desktop path, where a browser download is a worse
 * experience than one click into the calendar the person already has open.
 *
 * Safe to import from client components.
 */
import { contact, siteConfig } from "@/lib/site";
import { formatDuration } from "@/lib/booking/format";
import type { BookingSummary } from "@/lib/booking/types";

/** `20260825T010000Z` — the compact UTC form both services expect. */
function compactUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function title(booking: BookingSummary): string {
  return `${booking.serviceTitle} — ${siteConfig.shortName}`;
}

function details(booking: BookingSummary, manageUrl: string): string {
  return [
    `Therapist: ${booking.therapistDisplayName}`,
    `Duration: ${formatDuration(booking.durationMinutes)}`,
    `Booking reference: ${booking.reference}`,
    "",
    `Manage or cancel: ${manageUrl}`,
    `Questions: ${contact.whatsapp}`,
  ].join("\n");
}

export function googleCalendarUrl(
  booking: BookingSummary,
  manageUrl: string,
): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title(booking),
    dates: `${compactUtc(booking.startAt)}/${compactUtc(booking.endAt)}`,
    details: details(booking, manageUrl),
    location: contact.address,
    trp: "false",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(
  booking: BookingSummary,
  manageUrl: string,
): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title(booking),
    startdt: booking.startAt,
    enddt: booking.endAt,
    body: details(booking, manageUrl),
    location: contact.address,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
