/**
 * The message a WhatsApp link opens with, so the studio knows at a glance
 * what someone wants and where on the site they were.
 *
 * Every `wa.me` link on the site is plain in the markup (the header, the
 * footer, buttons, links inside page copy). `WhatsAppLinks`, mounted once in
 * `SiteChrome`, adds the message when one is clicked: the current page's own
 * (registered by `WhatsAppMessage` on treatments, articles and therapist
 * pages, which know their title) or the pathname's default below. Links that
 * already carry a `text` (booking confirmations, the contact form) keep
 * theirs.
 */

const HELLO = "Hi Flex & Flow!";

export function treatmentMessage(title: string, homeService: boolean): string {
  const article = /^[aeiou]/i.test(title) ? "an" : "a";
  return [
    `${HELLO} I'd like to book ${article} ${title} session.`,
    "",
    homeService ? "Studio or villa: " : null,
    "Preferred day and time: ",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function homeServiceMessage(): string {
  return [
    `${HELLO} I'd like to book a massage at my villa.`,
    "",
    "Treatment: ",
    "Where I'm staying: ",
    "Preferred day and time: ",
  ].join("\n");
}

export function articleMessage(title: string): string {
  return `${HELLO} I just read "${title}" on your website and have a question: `;
}

export function therapistMessage(name: string, founder: boolean): string {
  /* Ginny's diary fills first, so her page offers the team as the fallback
     in the message itself (DESIGN.md, copy rule). */
  return founder
    ? `${HELLO} I'd like to book a session with ${name}, or with the team if she's fully booked.\n\nPreferred day and time: `
    : `${HELLO} I'd like to book a session with ${name}.\n\nPreferred day and time: `;
}

const DEFAULTS: [RegExp, string][] = [
  [/^\/price-list\/?$/, `${HELLO} I've seen your price list and I'd like to book: `],
  [/^\/services\/?$/, `${HELLO} I'd like to book a treatment: `],
  [/^\/about-us\/?$/, `${HELLO} I'd like to book a session with your team.\n\nPreferred day and time: `],
  [/^\/(contact-us|blog)\/?/, `${HELLO} I have a question: `],
];

/** The message for a page that has not registered its own. */
export function defaultMessage(pathname: string): string {
  return (
    DEFAULTS.find(([pattern]) => pattern.test(pathname))?.[1] ??
    `${HELLO} I'd like to book a session.\n\nPreferred day and time: `
  );
}
