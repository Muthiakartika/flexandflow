/**
 * Proves the editor cannot corrupt the copy it opens.
 *
 * Body text is stored as `**bold**` / `*italic*` / `[text](url)` and edited as
 * HTML, so every save runs it through `markersToHtml` and back through
 * `htmlToMarkers`. If that round trip is not lossless, then simply opening a
 * published article and pressing save rewrites it — an apostrophe becomes an
 * entity, a link loses its href, a run of asterisks appears mid-sentence. On a
 * live page nobody would notice for weeks.
 *
 * So it is run over the real thing: every paragraph, list item, column entry
 * and FAQ question and answer in all 17 imported documents. That is what the
 * ported WordPress copy actually contains, including the typographic
 * apostrophes, the stray comma in the full-body massage page, and the
 * `**yoga**combines` with no space after the mark.
 *
 *   npm run check:inline
 */
import { htmlToMarkers, markersToHtml } from "@/lib/cms/inline";
import { posts } from "@/lib/data/posts";
import { services } from "@/lib/data/services";
import type { ContentBlock } from "@/types";

let checked = 0;
let failures = 0;

function roundTrip(where: string, original: string): void {
  checked += 1;
  const back = htmlToMarkers(markersToHtml(original));

  if (back === original) return;

  failures += 1;

  /* Point at the first character that differs — a 400-character paragraph
     printed twice is unreadable, and the difference is usually one glyph. */
  let at = 0;
  while (at < original.length && at < back.length && original[at] === back[at]) {
    at += 1;
  }

  const window = (value: string) =>
    JSON.stringify(value.slice(Math.max(0, at - 30), at + 30));

  console.log(
    `  FAIL  ${where} (differs at character ${at})\n` +
      `        before: ${window(original)}\n` +
      `        after:  ${window(back)}`,
  );
}

/** Every string in a body that `renderInline` runs markers on. */
function inlineStrings(body: ContentBlock[], where: string): void {
  body.forEach((block, index) => {
    const at = `${where} block ${index + 1} (${block.type})`;

    switch (block.type) {
      case "paragraph":
      case "callout":
      case "quote":
        roundTrip(at, block.text);
        break;
      case "list":
      case "columns":
        block.items.forEach((item, i) => roundTrip(`${at} item ${i + 1}`, item));
        break;
      case "faq":
        block.items.forEach((item, i) => {
          roundTrip(`${at} q${i + 1}`, item.question);
          roundTrip(`${at} a${i + 1}`, item.answer);
        });
        break;
      case "heading":
        /* `renderInline` does not run on headings — they render raw, so the
           editor disables the mark controls there. Checked anyway: a heading
           containing an asterisk must still survive a save unchanged. */
        roundTrip(at, block.text);
        break;
      default:
        break;
    }
  });
}

console.log("\nInline marker round trip, over the real content\n");

for (const service of services) {
  inlineStrings(service.body, `service ${service.slug}`);
  roundTrip(`service ${service.slug} excerpt`, service.excerpt);
}

for (const post of posts) {
  inlineStrings(post.body, `post ${post.slug}`);
  roundTrip(`post ${post.slug} excerpt`, post.excerpt);
}

/* Cases the ported copy happens not to contain but an editor will produce. */
const synthetic: [string, string][] = [
  ["plain text", "Nothing special here."],
  ["bold", "Some **bold** words."],
  ["italic", "Some *italic* words."],
  ["link", "Read the [price list](https://flexandflow.fit/price-list/) first."],
  ["bold at the start", "**Bold** opens the line."],
  ["bold at the end", "The line ends **bold**"],
  ["two marks", "**One** and *two* in the same line."],
  ["adjacent marks", "**One***two*"],
  ["ampersand", "Flex & Flow, and A&B."],
  ["angle brackets", "Use < and > sparingly."],
  ["quotes", 'She said "hello" and left.'],
  ["typographic apostrophe", "Your body’s natural flow."],
  ["mark with no trailing space", "Our **yoga**combines two things."],
  ["link with query string", "See [this](https://example.com/a?b=1&c=2)."],
  ["external link", "Book on [WhatsApp](https://wa.me/6281234567890)."],
  ["appointment exception", "Book at [our page](https://flexandflow.fit/appointment/)."],
];

for (const [label, value] of synthetic) {
  roundTrip(`synthetic: ${label}`, value);
}

console.log(
  failures === 0
    ? `\n  ok    all ${checked} strings survive the round trip unchanged\n`
    : `\n${failures} of ${checked} strings changed.\n`,
);

process.exit(failures === 0 ? 0 : 1);
