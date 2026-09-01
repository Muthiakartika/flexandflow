import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BTN_GHOST, BTN_SOLID } from "@/components/ui/tokens";
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

/** Renders the ported body content of a service or blog post page. */
export default function RichText({
  blocks,
  className = "",
}: {
  blocks: ContentBlock[];
  className?: string;
}) {
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
            return <Tag key={i}>{block.text}</Tag>;
          }

          case "paragraph":
            return <p key={i}>{renderInline(block.text)}</p>;

          case "list":
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

          /* The theme lays these bullets out in two columns. */
          case "columns":
            return (
              <ul key={i} className="icon-list list-none! pl-0!">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );

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
            return <InlineFaq key={i} items={block.items} />;

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

          /* A block written by a newer build degrades to nothing rather than
             throwing and taking an indexed page down with it. */
          default:
            return null;
        }
      })}
    </div>
  );
}
