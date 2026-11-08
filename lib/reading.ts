import type { ContentBlock } from "@/types";

/* A middle figure for reading on screen; the label rounds anyway. */
const WORDS_PER_MINUTE = 220;

/** The words a block shows. */
function textOf(block: ContentBlock): string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "callout":
    case "quote":
    case "imageText":
      return [block.text];
    case "list":
    case "columns":
      return block.items;
    case "faq":
      return block.items.flatMap((item) => [item.question, item.answer]);
    case "table":
      return [...block.head, ...block.rows.flat()];
    default:
      return [];
  }
}

/** Minutes to read a body, at least one; a link counts by its text only. */
export function readMinutes(blocks: ContentBlock[]): number {
  const words = blocks
    .flatMap(textOf)
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
