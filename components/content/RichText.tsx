import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { BTN_GHOST, BTN_SOLID } from "@/components/ui/tokens";
import { groupsFor, type ColumnGroups } from "@/lib/seo/layouts";
import CardSlider from "./CardSlider";
import InlineFaq from "./InlineFaq";
import type { ContentBlock } from "@/types";

/** Turn the extractor's `[text](href)` / `**bold**` / `*italic*` markers back
 *  into elements. Internal links use `next/link`. Exported for `InlineFaq`,
 *  which renders body text of its own outside this component's switch. */
export function renderInline(text: string): ReactNode[] {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));

    const [, linkText, href, bold, italic] = match;

    if (linkText && href) {
      const internal = href.startsWith("https://flexandflow.fit");
      const path = internal
        ? href.replace("https://flexandflow.fit", "").replace(/\/$/, "") || "/"
        : href;
      const staysOnWordPress = /\/appointment\/?$/.test(href);

      nodes.push(
        internal && !staysOnWordPress ? (
          <Link key={key++} href={path}>
            {linkText}
          </Link>
        ) : (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>
        ),
      );
    } else if (bold) {
      nodes.push(<strong key={key++}>{bold}</strong>);
    } else if (italic) {
      nodes.push(<em key={key++}>{italic}</em>);
    }

    last = pattern.lastIndex;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const TERM = /^\*\*([^*]+?):\*\*\s+([\s\S]+)$/;

/**
 * A bullet list whose every point opens with a bold label and a colon
 * ("**After a surf:** rinse off…"), split into label and detail, the detail
 * capitalised now that it starts its own line. Null when any point lacks
 * one, so a mixed list stays an ordinary list.
 */
function termsOf(items: string[]): { term: string; detail: string }[] | null {
  const matches = items.map((item) => item.match(TERM));
  return items.length >= 2 && matches.every((m) => m !== null)
    ? matches.map((m) => ({ term: m![1], detail: m![2][0].toUpperCase() + m![2].slice(1) }))
    : null;
}

const STEP = /^\*\*([^*]+?)[.:]\*\*\s+([\s\S]+)$/;

/**
 * A numbered list whose every step opens with a bold title ending in a full
 * stop or a colon ("**Book.** Use…", "**The same evening:** spend…"), split
 * into title and detail the same way. Null when any step lacks one.
 */
function stepsOf(items: string[]): { term: string; detail: string }[] | null {
  const matches = items.map((item) => item.match(STEP));
  return items.length >= 2 && matches.every((m) => m !== null)
    ? matches.map((m) => ({ term: m![1], detail: m![2][0].toUpperCase() + m![2].slice(1) }))
    : null;
}

/** A section heading's anchor: "Built Around How You Train" → "built-around-how-you-train".
 *  The scannable layout gives its h2s these ids for the "On this page" list. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

const FIGURE = /^(IDR\s?)?\d{1,3}(,\d{3})+$/;

/** A comparison whose last column, and only that one, is a price on every
 *  row: on a phone the price sits beside the row's title, so each card reads
 *  name and price at a glance. With two price columns (team and Ginny) the
 *  team's must not lose its place, so those stay as they are. */
function isPricedTable(block: Extract<ContentBlock, { type: "table" }>): boolean {
  const last = block.head.length - 1;
  const prices = (j: number) => block.rows.every((row) => FIGURE.test(row[j]?.trim() ?? ""));
  return last >= 2 && prices(last) && !block.head.slice(1, last).some((_, k) => prices(k + 1));
}

/** A table of prices: a label per row and nothing but figures after it. */
function isPriceTable(block: Extract<ContentBlock, { type: "table" }>): boolean {
  return (
    block.head.length >= 2 &&
    block.rows.length <= 8 &&
    block.rows.every((row) => row.slice(1).every((cell) => /IDR\s?\d/.test(cell)))
  );
}

/**
 * Renders the ported body content of a service or blog post page.
 *
 * `layout="scannable"` is the treatment-page redesign, on its pilot pages
 * first: two-column bullets become white cards, labelled lists become label
 * and detail, price tables a menu and FAQs numbered cards, so a long article
 * can be skimmed. The words and their order are unchanged.
 */
export default function RichText({
  blocks,
  className = "",
  layout = "article",
  columnGroups,
  before,
  after,
}: {
  blocks: ContentBlock[];
  className?: string;
  layout?: "article" | "scannable";
  /** How the scannable layout groups this page's two-column list
   *  (`lib/seo/layouts.ts`). */
  columnGroups?: ColumnGroups;
  /** Built elements to place straight before, or straight after, the heading
   *  with this exact text, for pieces that need live data (`ReviewsBand`,
   *  `TierChooser`). */
  before?: Record<string, ReactNode>;
  after?: Record<string, ReactNode>;
}) {
  const scannable = layout === "scannable";
  return (
    <div className={`prose-flex ${className}`.trim()}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as
              | "h1"
              | "h2"
              | "h3"
              | "h4"
              | "h5"
              | "h6";
            return (
              <Fragment key={i}>
                {before?.[block.text]}
                <Tag id={scannable && block.level === 2 ? headingId(block.text) : undefined}>
                  {block.text}
                </Tag>
                {after?.[block.text]}
              </Fragment>
            );
          }

          case "paragraph":
            return <p key={i}>{renderInline(block.text)}</p>;

          case "list": {
            /* Scannable layout: a labelled list reads as label and detail,
               ruled like the price menu. */
            const terms = scannable && !block.ordered ? termsOf(block.items) : null;
            if (terms) {
              return (
                <dl key={i} className="term-list">
                  {terms.map((item, j) => (
                    <div key={j}>
                      <dt>{renderInline(item.term)}</dt>
                      <dd>{renderInline(item.detail)}</dd>
                    </div>
                  ))}
                </dl>
              );
            }
            /* Scannable layout: titled steps read as a numbered timeline,
               one short title per step and its detail under it. */
            const steps = scannable && block.ordered ? stepsOf(block.items) : null;
            if (steps) {
              return (
                <ol key={i} className="step-list">
                  {steps.map((step, j) => (
                    <li key={j}>
                      <span aria-hidden className="step-list-num">
                        {String(j + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong className="step-list-title">{renderInline(step.term)}</strong>
                        <p className="step-list-detail">{renderInline(step.detail)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              );
            }
            return block.ordered ? (
              <ol key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          }

          /* The theme lays these bullets out in two columns. */
          case "columns": {
            /* Scannable layout: when the page groups this list, one numbered
               card per group, a slider on phones. The deck is named after
               the heading just above it. */
            const groups = scannable ? groupsFor(block.items, columnGroups) : null;
            if (groups) {
              const heading = [...blocks.slice(0, i)].reverse().find((b) => b.type === "heading");
              return (
                <CardSlider
                  key={i}
                  label={heading?.type === "heading" ? heading.text : "Cards"}
                  slides={groups.map((group) => ({
                    title: group.title,
                    points: group.items.map((n) => renderInline(block.items[n])),
                  }))}
                />
              );
            }
            return (
              <ul key={i} className={scannable ? "benefit-grid" : "icon-list list-none! pl-0!"}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          }

          case "image":
            return (
              <Image
                key={i}
                src={block.src}
                alt={block.alt}
                width={block.width}
                height={block.height}
                className="my-8 h-auto w-full rounded-[10px] object-cover"
              />
            );

          case "faq":
            return <InlineFaq key={i} items={block.items} variant={scannable ? "cards" : "plain"} />;

          /* Olive pull-quote callout box some posts drop mid-article, with a
             quote-mark glyph pinned to the bottom-right corner. */
          case "callout":
            return (
              <div
                key={i}
                className="relative my-10 overflow-hidden rounded-[10px] bg-primary-strong p-8 max-[767px]:p-6"
              >
                <h2 className="relative z-10 max-w-[54ch] text-left font-body text-[22px] leading-[1.45] text-white">
                  {block.text}
                </h2>
                <span
                  aria-hidden
                  className="absolute right-6 bottom-6 block h-12 w-12 bg-white/80"
                  style={{
                    maskImage: "url('/shapes/quote-mark.svg')",
                    WebkitMaskImage: "url('/shapes/quote-mark.svg')",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                  }}
                />
              </div>
            );

          /* ── Added with the CMS ─────────────────────────────────────── */

          /* Distinct from `callout`, which is the olive box. This is a quiet
             pull-quote with an optional name under it. */
          case "quote":
            return (
              <figure
                key={i}
                className="my-8 border-l-2 border-primary/40 pl-5 not-prose"
              >
                <blockquote className="font-body text-[19px] leading-[1.55] text-body-text/85">
                  {renderInline(block.text)}
                </blockquote>
                {block.attribution ? (
                  <figcaption className="mt-2 font-body text-[13px] text-body-text/55">
                    — {block.attribution}
                  </figcaption>
                ) : null}
              </figure>
            );

          case "gallery":
            /* Scannable layout: two captioned photos are a choice of two
               (studio or villa), set as an overlapping pair with an olive
               "or" on the seam and each caption as a tag on its photo. */
            if (scannable && block.images.length === 2 && block.images.every((image) => image.caption)) {
              return (
                <div key={i} className="photo-pair">
                  {block.images.map((image, j) => (
                    <figure key={j} className="photo-pair-item">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={image.width}
                        height={image.height}
                        sizes="(max-width: 639px) 80vw, 400px"
                        className="photo-pair-img"
                      />
                      <figcaption className="photo-pair-tag">{renderInline(image.caption!)}</figcaption>
                    </figure>
                  ))}
                  <span aria-hidden className="photo-pair-or">
                    or
                  </span>
                </div>
              );
            }
            return block.images.length === 0 ? null : (
              <ul
                key={i}
                className="my-8 grid list-none! grid-cols-2 gap-3 pl-0! sm:grid-cols-3"
              >
                {block.images.map((image, j) => (
                  <li key={j} className="m-0!">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(max-width: 640px) 45vw, 300px"
                      className="m-0! aspect-[4/3] w-full rounded-[10px] object-cover"
                    />
                  </li>
                ))}
              </ul>
            );

          case "imageText":
            return (
              <div
                key={i}
                className={`my-8 grid items-start gap-5 sm:grid-cols-2 ${
                  block.side === "right" ? "sm:[&>figure]:order-2" : ""
                }`}
              >
                <figure className="m-0!">
                  <Image
                    src={block.src}
                    alt={block.alt}
                    width={block.width}
                    height={block.height}
                    sizes="(max-width: 640px) 92vw, 420px"
                    className="m-0! aspect-[4/3] w-full rounded-[10px] object-cover"
                  />
                </figure>
                <p className="m-0!">{renderInline(block.text)}</p>
              </div>
            );

          case "cta": {
            /* Same internal-link rule as `renderInline`: only an exact
               `https://flexandflow.fit` prefix stays on the site. Anything
               else — including `flexandflow.id`, which redirects here — is a
               new tab, because that is what it actually is. */
            const internal = block.href.startsWith("https://flexandflow.fit");
            const path = internal
              ? block.href.replace("https://flexandflow.fit", "").replace(/\/$/, "") ||
                "/"
              : block.href;
            const staysExternal = /\/appointment\/?$/.test(block.href);

            const className =
              block.variant === "outline"
                ? `${BTN_GHOST} not-prose no-underline!`
                : `${BTN_SOLID} not-prose no-underline!`;

            return (
              <p key={i} className="my-7">
                {internal && !staysExternal ? (
                  <Link href={path} className={className}>
                    {block.label}
                  </Link>
                ) : (
                  <a
                    href={block.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {block.label}
                  </a>
                )}
              </p>
            );
          }

          case "divider": {
            const space =
              block.space === "small"
                ? "my-5"
                : block.space === "large"
                  ? "my-12"
                  : "my-8";

            return block.rule === false ? (
              <div key={i} aria-hidden className={space} />
            ) : (
              <hr key={i} className={`${space} border-0 border-t border-secondary/12`} />
            );
          }

          /* On a phone each row is a small card, its first cell the title
             and the rest labelled by their column (CSS in globals.css), in
             place of a table that scrolled sideways. From 640px it is a
             table; the wrapper stays focusable for the keyboard. */
          case "table":
            /* On the scannable layout a price table reads as a menu: one line
               per session, a dotted leader to its price, the other columns
               under it in small type labelled by their heading. The hero
               already carries the rate card, so this stays text, not cards. */
            if (scannable && isPriceTable(block)) {
              return (
                <dl key={i} className="price-menu">
                  {block.rows.map((row, r) => (
                    <div key={r} className="price-menu-row">
                      <dt>{renderInline(row[0])}</dt>
                      <span aria-hidden className="price-menu-leader" />
                      <dd>
                        <span className="price-menu-price">
                          <span className="sr-only">{block.head[1]}: </span>
                          {renderInline(row[1])}
                        </span>
                        {row.slice(2).map((cell, j) => (
                          <span key={j} className="price-menu-note">
                            {block.head[j + 2]} {renderInline(cell)}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              );
            }
            return (
              <div
                key={i}
                className={isPricedTable(block) ? "prose-table is-priced" : "prose-table"}
                role="region"
                aria-label="Table"
                tabIndex={0}
                style={{ "--cols": block.head.length } as CSSProperties}
              >
                <table>
                  <thead>
                    <tr>
                      {block.head.map((cell, j) => (
                        <th key={j} scope="col">
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, j) =>
                          /* A blank top-left corner makes the first column a
                             column of row labels. */
                          j === 0 && block.head[0] === "" ? (
                            <th key={j} scope="row">
                              {renderInline(cell)}
                            </th>
                          ) : (
                            /* The column's heading, shown as the value's
                               label where a phone stacks each row as a card
                               (`.prose-table` in globals.css). */
                            <td key={j} data-label={block.head[j] || undefined}>
                              {renderInline(cell)}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          /* A block written by a newer build degrades to nothing rather than
             throwing and taking an indexed page down with it. */
          default:
            return null;
        }
      })}
    </div>
  );
}
