/**
 * Between the editor's HTML and the markers the content is stored in.
 *
 * Body text is stored as `**bold**`, `*italic*` and `[text](url)`, because
 * that is what `renderInline` in `components/content/RichText.tsx` parses and
 * what 3,371 lines of ported WordPress copy already contain. The owner must
 * never type those, so the editor works in HTML and these two functions carry
 * it across.
 *
 * **The round trip has to be lossless**, and `scripts/check-inline.ts` proves
 * it over every paragraph, list item, column and FAQ answer in the real
 * content. Without that, the first time somebody opened a page and pressed
 * save, an apostrophe or a link could quietly change on a live article.
 *
 * No DOM. `DOMParser` would work in the browser and not in the check script,
 * and the markup involved is four tags — a tokeniser is smaller than the
 * conditional import would be.
 *
 * ## Bold and italic do not nest
 *
 * The stored format cannot express both at once: `***text***` matches neither
 * of `renderInline`'s patterns (each needs a run with no asterisk inside), so
 * it would render as literal asterisks on the page. The editor therefore
 * treats the two as mutually exclusive — applying one clears the other — and
 * this serialiser prefers bold if both ever arrive together, which loses the
 * italic rather than breaking the paragraph.
 */

const ESCAPES: [RegExp, string][] = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
];

function escapeHtml(value: string): string {
  return ESCAPES.reduce((text, [from, to]) => text.replace(from, to), value);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    /* Last, or `&amp;lt;` would decode twice into `<`. */
    .replace(/&amp;/g, "&");
}

/**
 * `"Some **bold** and [a link](https://…)"` → the HTML TipTap edits.
 *
 * Uses the same pattern as `renderInline`, so anything the site renders as a
 * mark is what the editor shows as one, and anything it renders literally
 * stays literal here too.
 */
export function markersToHtml(text: string): string {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

  let html = "";
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) html += escapeHtml(text.slice(last, match.index));

    const [, linkText, href, bold, italic] = match;

    if (linkText && href) {
      html += `<a href="${escapeHtml(href)}">${escapeHtml(linkText)}</a>`;
    } else if (bold) {
      html += `<strong>${escapeHtml(bold)}</strong>`;
    } else if (italic) {
      html += `<em>${escapeHtml(italic)}</em>`;
    }

    last = pattern.lastIndex;
  }

  if (last < text.length) html += escapeHtml(text.slice(last));

  return html;
}

type Token =
  | { kind: "text"; value: string }
  | { kind: "open"; tag: string; href?: string }
  | { kind: "close"; tag: string };

/** Only the tags the editor is allowed to produce. Anything else is dropped. */
const KNOWN = new Set(["strong", "b", "em", "i", "a", "p", "br"]);

function tokenise(html: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*)?)>/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    if (match.index > last) {
      tokens.push({ kind: "text", value: html.slice(last, match.index) });
    }

    const tag = match[1].toLowerCase();
    const closing = match[0].startsWith("</");

    if (KNOWN.has(tag)) {
      if (closing) {
        tokens.push({ kind: "close", tag });
      } else {
        const raw = /href="([^"]*)"/i.exec(match[2] ?? "")?.[1];
        /* Decoded, like any other attribute value. A query string is the
           common case — `?b=1&c=2` is written into the attribute as
           `?b=1&amp;c=2`, and storing it that way would put a literal
           `&amp;` in the URL the page links to. */
        const href = raw === undefined ? undefined : decodeHtml(raw);
        tokens.push({ kind: "open", tag, ...(href ? { href } : {}) });
      }
    }

    last = pattern.lastIndex;
  }

  if (last < html.length) tokens.push({ kind: "text", value: html.slice(last) });

  return tokens;
}

/**
 * The editor's HTML → the stored markers.
 *
 * Empty marks are dropped rather than emitted: `<strong></strong>` is a thing
 * ProseMirror leaves behind when someone bolds a selection and then deletes
 * it, and `****` in the stored text renders as four literal asterisks.
 */
export function htmlToMarkers(html: string): string {
  let out = "";
  let bold = 0;
  let italic = 0;
  let href: string | null = null;
  let linkText = "";

  const emit = (value: string) => {
    if (href !== null) {
      linkText += value;
      return;
    }
    out += value;
  };

  for (const token of tokenise(html)) {
    if (token.kind === "text") {
      const value = decodeHtml(token.value);
      if (!value) continue;

      if (href !== null) {
        linkText += value;
      } else if (bold > 0) {
        /* Bold wins when both are set — see the note at the top. */
        out += `**${value}**`;
      } else if (italic > 0) {
        out += `*${value}*`;
      } else {
        out += value;
      }
      continue;
    }

    if (token.kind === "open") {
      if (token.tag === "strong" || token.tag === "b") bold += 1;
      else if (token.tag === "em" || token.tag === "i") italic += 1;
      else if (token.tag === "a") {
        href = token.href ?? "";
        linkText = "";
      } else if (token.tag === "br") emit(" ");
      continue;
    }

    if (token.tag === "strong" || token.tag === "b") bold = Math.max(0, bold - 1);
    else if (token.tag === "em" || token.tag === "i") {
      italic = Math.max(0, italic - 1);
    } else if (token.tag === "a") {
      if (linkText) out += `[${linkText}](${href ?? ""})`;
      href = null;
      linkText = "";
    } else if (token.tag === "p") {
      /* A paragraph break inside one block becomes a space. The block editor
         gives each paragraph its own block, so this only fires when somebody
         pastes multi-paragraph text into one — where a run-on sentence is a
         better outcome than losing the second half. */
      if (out && !out.endsWith(" ")) out += " ";
    }
  }

  /* Collapse the runs of whitespace a paste can leave, but keep the copy's own
     single spaces exactly as they were. */
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/** Straight quotes to typographic ones, which is what the copy uses throughout. */
export function smartenQuotes(text: string): string {
  return (
    text
      /* Apostrophe inside a word first — "body's", "it's" — so the opening
         single-quote rule below cannot claim it. */
      .replace(/(\w)'(\w)/g, "$1’$2")
      .replace(/'(\w)/g, "‘$1")
      .replace(/(\w)'/g, "$1’")
      .replace(/"(\w)/g, "“$1")
      .replace(/(\w)"/g, "$1”")
  );
}
