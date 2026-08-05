import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import InlineFaq from "./InlineFaq";
import type { ContentBlock } from "@/types";

/** Turn the extractor's `[text](href)` / `**bold**` / `*italic*` markers back
 *  into elements. Internal links use `next/link`. */
function renderInline(text: string): ReactNode[] {
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
      const staysOnWordPress = /\/(price-list|appointment)\/?$/.test(href);

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
            const Tag = `h${block.level}` as "h2" | "h3" | "h4";
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

          default:
            return null;
        }
      })}
    </div>
  );
}
