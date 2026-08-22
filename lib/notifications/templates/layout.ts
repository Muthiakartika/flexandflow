/**
 * The one HTML shell every booking email is poured into.
 *
 * Email is not the web. Several clients strip a `<style>` block, Outlook
 * renders through Word and drops flexbox and grid entirely, and a web font is
 * a request most clients refuse. So: nested tables, inline styles, one column,
 * and a 600px measure that has been the safe width since Outlook 2007. A
 * template that looks better in a browser preview and collapses in Outlook is
 * the worse template.
 *
 * Templates never write HTML themselves. They describe a booking as headings,
 * paragraphs, labelled rows and actions, and this file renders both the HTML
 * and the plain-text part from that one description — which is why the two can
 * never drift apart and tell the customer different things.
 */
import "server-only";

import { contact, siteConfig, workingHours } from "@/lib/site";

/** What a template hands to the mailer. Both parts, always — see `email.ts`. */
export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

/** One labelled fact. `href` turns the value into a link. */
export type DetailRow = {
  label: string;
  value: string;
  href?: string;
};

export type EmailAction = {
  label: string;
  href: string;
  /** Filled olive. At most one per email; the rest render as plain links. */
  primary?: boolean;
};

export type EmailBody = {
  subject: string;
  /** The grey line an inbox shows after the subject. Wasted if left empty. */
  preheader: string;
  heading: string;
  intro?: string[];
  rows?: DetailRow[];
  actions?: EmailAction[];
  outro?: string[];
};

/**
 * Brand palette, per DESIGN.md.
 *
 * `#6d7932` rather than the brand olive `#7f8c3a` for anything filled that
 * carries white text: the brand olive is 3.67:1 against white and fails AA,
 * and an email is read on a phone in daylight more often than a web page is.
 */
const COLOR = {
  ground: "#f0efeb",
  surface: "#ffffff",
  olive: "#6d7932",
  text: "#000000",
  muted: "#4a4a4a",
  border: "#ddd9d0",
  onOlive: "#ffffff",
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,Segoe UI,Arial,Helvetica,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A URL safe to put in an `href`.
 *
 * Everything linked from a booking email is built by this app, but a customer's
 * note is not, and `javascript:` in an href is one refactor away from being a
 * problem the day someone renders user text as a link.
 */
function safeUrl(value: string): string {
  return /^https?:\/\//i.test(value) || value.startsWith("mailto:")
    ? escapeHtml(value)
    : "#";
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px 0;font-family:${FONT};font-size:15px;line-height:23px;color:${COLOR.text};">${escapeHtml(text)}</p>`;
}

/**
 * Rows stack label over value rather than sitting in two columns.
 *
 * Two columns need a media query to survive a 320px screen, and media queries
 * inside email are exactly what Outlook and Gmail's Android app disagree
 * about. Stacked needs nothing and reads the same everywhere.
 */
function renderRows(rows: DetailRow[]): string {
  const cells = rows
    .map((row, index) => {
      const value = row.href
        ? `<a href="${safeUrl(row.href)}" style="color:${COLOR.olive};text-decoration:underline;">${escapeHtml(row.value)}</a>`
        : escapeHtml(row.value);
      const border = index === 0 ? "" : `border-top:1px solid ${COLOR.border};`;

      return [
        `<tr><td style="padding:10px 0;${border}">`,
        `<span style="display:block;font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.muted};">${escapeHtml(row.label)}</span>`,
        `<span style="display:block;padding-top:2px;font-family:${FONT};font-size:15px;line-height:22px;color:${COLOR.text};">${value}</span>`,
        `</td></tr>`,
      ].join("\n");
    })
    .join("\n");

  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 18px 0;">`,
    cells,
    `</table>`,
  ].join("\n");
}

function renderAction(action: EmailAction): string {
  if (!action.primary) {
    return [
      `<p style="margin:0 0 10px 0;font-family:${FONT};font-size:15px;line-height:22px;">`,
      `<a href="${safeUrl(action.href)}" style="color:${COLOR.olive};text-decoration:underline;">${escapeHtml(action.label)}</a>`,
      `</p>`,
    ].join("\n");
  }

  /* A table, not a padded anchor: Outlook ignores padding on inline elements
     and would render this as a bare underlined word. */
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 14px 0;">`,
    `<tr><td bgcolor="${COLOR.olive}" style="background-color:${COLOR.olive};border-radius:4px;">`,
    `<a href="${safeUrl(action.href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:bold;color:${COLOR.onOlive};text-decoration:none;">${escapeHtml(action.label)}</a>`,
    `</td></tr>`,
    `</table>`,
  ].join("\n");
}

function hoursLine(): string {
  return workingHours
    .map((entry) => `${entry.days}, ${entry.hours}`)
    .join(" · ");
}

function footerHtml(): string {
  const small = `margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:19px;color:${COLOR.muted};`;
  const link = `color:${COLOR.olive};text-decoration:underline;`;

  return [
    `<p style="${small}">${escapeHtml(siteConfig.name)} — ${escapeHtml(contact.address)}</p>`,
    `<p style="${small}">WhatsApp <a href="${safeUrl(contact.whatsapp)}" style="${link}">${escapeHtml(contact.phone)}</a> · <a href="mailto:${escapeHtml(contact.email)}" style="${link}">${escapeHtml(contact.email)}</a></p>`,
    `<p style="${small}margin-bottom:0;">${escapeHtml(hoursLine())}</p>`,
  ].join("\n");
}

function footerText(): string {
  return [
    `${siteConfig.name} — ${contact.address}`,
    `WhatsApp ${contact.phone} · ${contact.email}`,
    hoursLine(),
  ].join("\n");
}

export function renderEmail(body: EmailBody): EmailContent {
  const blocks: string[] = [
    `<h1 style="margin:0 0 16px 0;font-family:${FONT};font-size:22px;line-height:29px;font-weight:bold;color:${COLOR.text};">${escapeHtml(body.heading)}</h1>`,
  ];

  for (const line of body.intro ?? []) blocks.push(paragraph(line));
  if (body.rows?.length) blocks.push(renderRows(body.rows));
  for (const action of body.actions ?? []) blocks.push(renderAction(action));
  for (const line of body.outro ?? []) blocks.push(paragraph(line));

  const html = [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${escapeHtml(body.subject)}</title>`,
    `</head>`,
    `<body style="margin:0;padding:0;background-color:${COLOR.ground};">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(body.preheader)}</div>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background-color:${COLOR.ground};">`,
    `<tr>`,
    `<td align="center" style="padding:24px 12px;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:collapse;">`,
    `<tr>`,
    `<td bgcolor="${COLOR.olive}" style="background-color:${COLOR.olive};padding:18px 24px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:bold;letter-spacing:0.04em;color:${COLOR.onOlive};">${escapeHtml(siteConfig.shortName)}</td>`,
    `</tr>`,
    `<tr>`,
    `<td bgcolor="${COLOR.surface}" style="background-color:${COLOR.surface};padding:26px 24px 20px 24px;">`,
    blocks.join("\n"),
    `</td>`,
    `</tr>`,
    `<tr>`,
    `<td style="padding:18px 24px 0 24px;">`,
    footerHtml(),
    `</td>`,
    `</tr>`,
    `</table>`,
    `</td>`,
    `</tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("\n");

  return { subject: body.subject, html, text: renderText(body) };
}

/**
 * The plain-text part.
 *
 * Not politeness. A message with no `text/plain` alternative scores as spam at
 * several filters, and it is the part that survives a watch notification and a
 * client with HTML turned off.
 */
function renderText(body: EmailBody): string {
  const lines: string[] = [body.heading, ""];

  for (const line of body.intro ?? []) lines.push(line, "");

  for (const row of body.rows ?? []) {
    lines.push(`${row.label}: ${row.value}`);
    if (row.href) lines.push(`  ${row.href}`);
  }
  if (body.rows?.length) lines.push("");

  for (const action of body.actions ?? []) {
    lines.push(`${action.label}: ${action.href}`);
  }
  if (body.actions?.length) lines.push("");

  for (const line of body.outro ?? []) lines.push(line, "");

  lines.push("--", footerText());

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
