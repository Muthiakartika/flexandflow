/**
 * The seven booking emails, written as data rather than as HTML.
 *
 * Each one describes a booking to `renderEmail`, which owns the table shell.
 * The facts are the same in every direction — reference, service, therapist,
 * when, how much, where — so they are assembled once in `customerRows` and the
 * admin variants add what only the studio needs: who booked, how to reach them,
 * and what they asked for.
 *
 * The copy stays with what the site already says. No offers, no reassurance the
 * studio has not put its name to elsewhere.
 */
import "server-only";

import {
  formatDuration,
  formatIdr,
  formatPhoneDisplay,
  fullName,
  whatsappLink,
} from "@/lib/booking/format";
import type { BookingView } from "@/lib/booking/types";
import { formatStudioDate, formatStudioTime } from "@/lib/booking/time";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/payments/types";
import { contact, siteConfig } from "@/lib/site";

import {
  renderEmail,
  type DetailRow,
  type EmailAction,
  type EmailContent,
} from "@/lib/notifications/templates/layout";

/**
 * A maps link for the studio, derived rather than stored.
 *
 * `lib/site.ts` holds the address as one string because that is how it is
 * printed everywhere else; a second, place-id-shaped constant would be one
 * more thing to keep in sync with it.
 */
function mapsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;
}

/** The timezone is spelled out: a customer flying in reads this from anywhere. */
function whenRows(view: BookingView): DetailRow[] {
  return [
    { label: "Date", value: view.dateLabel },
    { label: "Time (WITA, UTC+8)", value: view.timeLabel },
    { label: "Duration", value: formatDuration(view.durationMinutes) },
  ];
}

function customerRows(view: BookingView): DetailRow[] {
  return [
    { label: "Booking reference", value: view.reference },
    { label: "Service", value: view.serviceTitle },
    { label: "Therapist", value: view.therapistDisplayName },
    ...whenRows(view),
    { label: "Price", value: formatIdr(view.priceIdr) },
    { label: "Studio", value: contact.address, href: mapsUrl() },
  ];
}

function adminRows(view: BookingView): DetailRow[] {
  const rows: DetailRow[] = [
    { label: "Booking reference", value: view.reference },
    { label: "Service", value: view.serviceTitle },
    { label: "Therapist", value: view.therapistDisplayName },
    ...whenRows(view),
    { label: "Price", value: formatIdr(view.priceIdr) },
    {
      label: "Customer",
      value: fullName(view.customer.firstName, view.customer.lastName),
    },
    {
      /* Tappable rather than printed: on a phone this row is the reply. */
      label: "WhatsApp",
      value: formatPhoneDisplay(view.customer.phoneE164),
      href: whatsappLink(view.customer.phoneE164),
    },
  ];

  if (view.customer.email) {
    rows.push({
      label: "Email",
      value: view.customer.email,
      href: `mailto:${view.customer.email}`,
    });
  }

  if (view.customer.note) {
    rows.push({ label: "Note from the customer", value: view.customer.note });
  }

  return rows;
}

function customerActions(view: BookingView): EmailAction[] {
  return [
    {
      label: "Add to Google Calendar",
      href: view.googleCalendarUrl,
      primary: true,
    },
    { label: "View or change this booking", href: view.manageUrl },
  ];
}

/** Where the studio is written to for anything the email cannot settle. */
function whatsAppAction(): EmailAction {
  return { label: "Message the studio on WhatsApp", href: contact.whatsapp };
}

// ── Customer ──────────────────────────────────────────────────────────────

export function customerConfirmationEmail(view: BookingView): EmailContent {
  return renderEmail({
    subject: `Booking confirmed — ${view.reference}`,
    preheader: `${view.serviceTitle} with ${view.therapistName}, ${view.dateLabel}, ${view.timeLabel} WITA.`,
    heading: "Your booking is confirmed",
    intro: [
      `Hi ${view.customer.firstName}, your session at ${siteConfig.shortName} is booked. The details are below.`,
      "A calendar file is attached to this email. Opening it on a phone adds the session to the calendar you already use.",
    ],
    rows: customerRows(view),
    actions: customerActions(view),
    outro: [
      `Keep the reference ${view.reference} — it is what we look you up by.`,
    ],
  });
}

/**
 * The receipt, on the pay-now path only.
 *
 * Sent beside the confirmation rather than folded into it, because the two do
 * different jobs: the confirmation is what a customer opens the morning of the
 * session, and the receipt is what they keep, forward to whoever is paying, or
 * dig out if a charge is queried. It carries no calendar file and no manage
 * link for that reason — nothing here changes a booking.
 */
export function customerPaymentReceivedEmail(
  view: BookingView,
): EmailContent | null {
  const paid = view.receipt;

  /* Only ever queued once a payment settled, so this is unreachable. Null
     rather than a throw, because the caller already treats null as "there is
     nothing to send for this kind" and retires the job — where an exception
     would escape into the dispatch loop and take the whole batch with it.
     Guessing at the figure is the one failure here a customer could act on. */
  if (!paid) return null;

  const rows: DetailRow[] = [
    { label: "Amount paid", value: formatIdr(paid.amountPaidIdr) },
    { label: "Paid with", value: PAYMENT_CHANNEL_LABEL[paid.channel] },
    {
      label: "Paid at",
      /* Studio time, like every other instant this site shows a customer. The
         server is UTC and would be eight hours out. */
      value: `${formatStudioDate(new Date(paid.paidAt))}, ${formatStudioTime(new Date(paid.paidAt))} WITA`,
    },
    { label: "Booking reference", value: view.reference },
    { label: "Service", value: view.serviceTitle },
    ...whenRows(view),
  ];

  /* Xendit's own id for the charge. Meaningless to most people and the first
     thing asked for by anyone whose bank statement disagrees with us, so it
     goes last rather than not at all. */
  if (paid.providerId) {
    rows.push({ label: "Payment id", value: paid.providerId });
  }

  return renderEmail({
    subject: `Payment received — ${view.reference}`,
    preheader: `${formatIdr(paid.amountPaidIdr)} received for ${view.serviceTitle}.`,
    heading: "We have your payment",
    intro: [
      `Hi ${view.customer.firstName}, thank you — your payment has arrived and there is nothing left to pay at the studio.`,
      "Your booking confirmation, with the calendar file and the link to change the time, is in a separate email.",
    ],
    rows,
    actions: [whatsAppAction()],
    outro: [
      `Keep this email as your receipt. Quote ${view.reference} if you ever need to ask us about it.`,
    ],
  });
}

export function customerReminderEmail(view: BookingView): EmailContent {
  return renderEmail({
    subject: `Tomorrow: ${view.serviceTitle} — ${view.reference}`,
    preheader: `${view.dateLabel}, ${view.timeLabel} WITA with ${view.therapistName}.`,
    heading: "Your session is tomorrow",
    intro: [
      `Hi ${view.customer.firstName}, a reminder of your session at ${siteConfig.shortName} tomorrow.`,
    ],
    rows: customerRows(view),
    actions: [
      { label: "View or change this booking", href: view.manageUrl },
      whatsAppAction(),
    ],
  });
}

export function customerCancelledEmail(view: BookingView): EmailContent {
  const reason = view.cancelReason
    ? [`Reason given: ${view.cancelReason}`]
    : [];

  return renderEmail({
    subject: `Booking cancelled — ${view.reference}`,
    preheader: `${view.serviceTitle}, ${view.dateLabel} — cancelled.`,
    heading: "Your booking has been cancelled",
    intro: [
      `Hi ${view.customer.firstName}, the session below has been cancelled. Nothing further is needed from you.`,
      ...reason,
    ],
    rows: customerRows(view),
    actions: [whatsAppAction()],
    outro: [
      "If you did not expect this, message us on WhatsApp and we will sort it out.",
    ],
  });
}

export function customerRescheduledEmail(view: BookingView): EmailContent {
  return renderEmail({
    subject: `Booking moved — ${view.reference}`,
    preheader: `New time: ${view.dateLabel}, ${view.timeLabel} WITA.`,
    heading: "Your booking has been moved",
    intro: [
      `Hi ${view.customer.firstName}, your session now runs at the time below. Everything else is unchanged.`,
      /* Same UID, higher SEQUENCE — the attachment updates the event already
         in the customer's calendar instead of leaving two of them there. */
      "The attached calendar file replaces the earlier one rather than adding a second event.",
    ],
    rows: customerRows(view),
    actions: customerActions(view),
  });
}

// ── Studio ────────────────────────────────────────────────────────────────

export function adminNewBookingEmail(view: BookingView): EmailContent {
  return renderEmail({
    subject: `New booking — ${view.reference}, ${view.dateLabel}`,
    preheader: `${view.serviceTitle} with ${view.therapistName}, ${view.timeLabel} WITA.`,
    heading: "New booking",
    intro: [
      `${fullName(view.customer.firstName, view.customer.lastName)} booked ${view.serviceTitle} with ${view.therapistDisplayName}.`,
    ],
    rows: adminRows(view),
    actions: [
      {
        label: "Reply on WhatsApp",
        href: whatsappLink(view.customer.phoneE164),
        primary: true,
      },
      { label: "Open the booking", href: view.manageUrl },
    ],
  });
}

export function adminCancelledEmail(view: BookingView): EmailContent {
  const reason = view.cancelReason
    ? [`Reason given: ${view.cancelReason}`]
    : [];

  return renderEmail({
    subject: `Cancelled — ${view.reference}, ${view.dateLabel}`,
    preheader: `${view.serviceTitle} with ${view.therapistName} — the slot is free again.`,
    heading: "Booking cancelled",
    intro: [
      "The session below has been cancelled and the slot is open again.",
      ...reason,
    ],
    rows: adminRows(view),
    actions: [
      { label: "Reply on WhatsApp", href: whatsappLink(view.customer.phoneE164) },
    ],
  });
}

/**
 * What `sendTestMessages` sends. Only ever addressed to the studio's own
 * inbox from the settings page — it carries no booking because it exists to
 * prove that SendGrid, the from-address and the DNS records are working.
 */
export function testEmail(): EmailContent {
  return renderEmail({
    subject: `Test message from the ${siteConfig.shortName} booking system`,
    preheader: "Delivery check. No action needed.",
    heading: "Test message",
    intro: [
      "This was sent from the booking system to check that email delivery is working.",
      "If it arrived in the inbox rather than in spam, the sending domain is set up correctly.",
    ],
    outro: ["No action needed."],
  });
}

export function adminRescheduledEmail(view: BookingView): EmailContent {
  return renderEmail({
    subject: `Moved — ${view.reference}, ${view.dateLabel}`,
    preheader: `New time: ${view.dateLabel}, ${view.timeLabel} WITA.`,
    heading: "Booking moved",
    intro: ["The session below now runs at a new time."],
    rows: adminRows(view),
    actions: [
      {
        label: "Reply on WhatsApp",
        href: whatsappLink(view.customer.phoneE164),
        primary: true,
      },
      { label: "Open the booking", href: view.manageUrl },
    ],
  });
}
