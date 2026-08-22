/**
 * The `.ics` file — the primary path into a customer's calendar.
 *
 * `lib/calendar/links.ts` covers the desktop one-click case; this is what gets
 * attached to the confirmation email as `text/calendar` and what iOS and
 * Android hand straight to the built-in calendar when the attachment is
 * tapped. So it has to parse everywhere, not just in the one client we happen
 * to test with.
 *
 * No library. RFC 5545 is only awkward in three places — CRLF, text escaping
 * and line folding — and each of those is a few lines here, which is less code
 * than a dependency and far less than debugging one.
 *
 * Safe to import from a server route: no environment, no database.
 */
import { contact, siteConfig } from "@/lib/site";
import { formatDuration } from "@/lib/booking/format";
import type { BookingSummary } from "@/lib/booking/types";

export type IcsMethod = "PUBLISH" | "CANCEL";

/**
 * RFC 5545 §3.1: lines are delimited by CRLF, not LF. This is not pedantry —
 * Outlook and several mobile parsers reject a bare-LF file outright rather
 * than repairing it, and the failure looks like "the attachment does nothing".
 */
const CRLF = "\r\n";

/** Octets, excluding the line break. RFC 5545 §3.1. */
const MAX_OCTETS = 75;

const UID_DOMAIN = "flexandflow.fit";

const encoder = new TextEncoder();

/** `20260825T010000Z` — the compact UTC form, as in `links.ts`. */
function compactUtc(value: string | Date): string {
  const instant = typeof value === "string" ? new Date(value) : value;
  return instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escapes a TEXT value (RFC 5545 §3.3.11): backslash, semicolon and comma each
 * take a backslash, and a real newline becomes the two literal characters
 * `\n`. The comma is the one that bites — the studio address contains three of
 * them, and an unescaped comma is a value separator, so `LOCATION` would
 * silently arrive as "Jl. Toya Ning II" and nothing else.
 *
 * Order matters: backslashes first, or we would escape the ones we just added.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Escapes a *parameter* value (RFC 5545 §3.2) — different rules from TEXT.
 * Parameters are not backslash-escaped; a value containing `:`, `;` or `,` is
 * wrapped in double quotes instead. "Flex & Flow" needs neither, but the
 * distinction is exactly the kind of thing that breaks when the studio name
 * changes, so encode it rather than rely on today's string.
 */
function escapeParam(value: string): string {
  const cleaned = value.replace(/["\r\n]/g, "");
  return /[:;,]/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

/**
 * Folds one content line to 75 octets (RFC 5545 §3.1): break, then continue
 * with CRLF plus a single leading space, which the parser strips again.
 *
 * Counted in octets, not characters — the studio's copy is full of em-dashes
 * ("Assisted Stretching — Flex & Flow") and en-dashes, which are three bytes
 * each in UTF-8. A character-counting folder produces lines that look fine and
 * are over the limit. We also step by code point so a fold never lands inside
 * a multi-byte sequence or splits a surrogate pair.
 *
 * The continuation space counts toward its line's 75, hence the 74 budget.
 */
function foldLine(line: string): string {
  const lines: string[] = [];
  let current = "";
  let octets = 0;
  let budget = MAX_OCTETS;

  for (const char of line) {
    const size = encoder.encode(char).length;

    if (octets + size > budget) {
      lines.push(current);
      current = "";
      octets = 0;
      budget = MAX_OCTETS - 1;
    }

    current += char;
    octets += size;
  }

  lines.push(current);
  return lines.join(`${CRLF} `);
}

/** `SUMMARY` + an escaped TEXT value, folded. */
function textLine(property: string, value: string): string {
  return foldLine(`${property}:${escapeText(value)}`);
}

function summary(booking: BookingSummary): string {
  return `${booking.serviceTitle} — ${siteConfig.shortName}`;
}

function description(booking: BookingSummary, manageUrl: string): string {
  return [
    `Therapist: ${booking.therapistDisplayName}`,
    `Duration: ${formatDuration(booking.durationMinutes)}`,
    `Booking reference: ${booking.reference}`,
    "",
    `Manage or cancel: ${manageUrl}`,
    `Questions: ${contact.whatsapp}`,
  ].join("\n");
}

/**
 * One `VCALENDAR` with one `VEVENT`, ready to attach or serve.
 *
 * `options.sequence` must rise every time the booking changes — see the note
 * on `UID` below.
 */
export function bookingIcs(
  booking: BookingSummary,
  options: { method: IcsMethod; sequence: number; manageUrl: string },
): string {
  const cancelled = options.method === "CANCEL";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteConfig.name}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    `METHOD:${options.method}`,
    "BEGIN:VEVENT",

    /*
     * The UID is derived from the booking id and never changes for the life of
     * that booking. Together with a SEQUENCE that rises on every reschedule or
     * cancellation, that is what makes a second .ics *update* the event already
     * sitting in the customer's calendar instead of adding a duplicate beside
     * it. Neither half works alone: a fresh UID always duplicates, and a
     * repeated UID with a stale SEQUENCE is discarded as an older copy.
     */
    `UID:${booking.id}@${UID_DOMAIN}`,
    `SEQUENCE:${options.sequence}`,

    /*
     * All three stamps are UTC — the trailing `Z` form, so no VTIMEZONE block
     * is needed and the customer's client renders it in whatever zone they are
     * standing in.
     *
     * DTEND comes from `BookingSummary.endAt`, which is the customer-facing
     * end of the session and deliberately excludes the studio's clean-down
     * buffer (that lives on the slot, not the summary). The customer's calendar
     * should show the session they booked, not the room turnover afterwards.
     */
    `DTSTAMP:${compactUtc(new Date())}`,
    `DTSTART:${compactUtc(booking.startAt)}`,
    `DTEND:${compactUtc(booking.endAt)}`,

    textLine("SUMMARY", summary(booking)),
    textLine("DESCRIPTION", description(booking, options.manageUrl)),
    textLine("LOCATION", contact.address),

    `ORGANIZER;CN=${escapeParam(siteConfig.shortName)}:mailto:${contact.email}`,

    /* URL is a URI value, not TEXT — escaping it would corrupt the link, so it
       is folded but never escaped. */
    foldLine(`URL:${options.manageUrl}`),

    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    /* The session occupies the customer's time; show it as busy. */
    "TRANSP:OPAQUE",
  ];

  /* A cancelled event should not ring an hour before the appointment nobody is
     attending, so the alarm goes in only for PUBLISH. */
  if (!cancelled) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-PT60M",
      textLine("DESCRIPTION", `${summary(booking)} starts in 1 hour`),
      "END:VALARM",
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  /* Trailing CRLF: the last line needs its delimiter too. */
  return `${lines.join(CRLF)}${CRLF}`;
}

/** Suggested filename, e.g. `flexandflow-FF-8KQ2M.ics`. */
export function icsFilename(booking: BookingSummary): string {
  /* The reference is ours and already tame, but this string ends up in a
     Content-Disposition header, so keep anything exotic out of it. */
  const reference = booking.reference.replace(/[^A-Za-z0-9-]/g, "-");
  return `flexandflow-${reference}.ics`;
}
