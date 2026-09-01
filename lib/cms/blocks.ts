/**
 * The body format, as a runtime schema.
 *
 * `ContentBlock[]` in `types/index.ts` is a compile-time type, and the CMS
 * stores it as JSON — which means by the time it comes back out of Postgres,
 * TypeScript has no idea what it is. Everything written goes through
 * `parseBlocks` and everything read goes through `readBlocks`, so a malformed
 * block cannot reach `RichText` and take a page down with it.
 *
 * Deliberately not `server-only`: the block editor is a client component and
 * validates the same way, so the editor and the writer cannot disagree about
 * what a valid block is.
 */
import { z } from "zod";

import type { ContentBlock } from "@/types";

/** Non-empty after trimming. Most block text is meaningless when blank. */
const text = z.string().trim().min(1);

/**
 * Intrinsic dimensions, required together.
 *
 * `next/image` needs both, and the blog listing packs its masonry from
 * `imageWidth`/`imageHeight`. An image stored without them renders at zero and
 * then jumps when the file loads, which reads as a broken page.
 */
const image = {
  src: z.string().min(1),
  alt: z.string().default(""),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
};

const headingBlock = z.object({
  type: z.literal("heading"),
  /**
   * All six, at the owner's request.
   *
   * `h1` is accepted but is nearly always wrong here: `PageHero` already
   * renders the page title as the document's `h1`, so one in the body is a
   * *second* one, which flattens the outline every screen reader and search
   * engine navigates by. The editor says so beside the control rather than
   * refusing the choice — see `BlockEditor`.
   */
  level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  text,
});

const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  text,
});

const listBlock = z.object({
  type: z.literal("list"),
  items: z.array(text).min(1),
  ordered: z.boolean().optional(),
});

const columnsBlock = z.object({
  type: z.literal("columns"),
  items: z.array(text).min(1),
});

const imageBlock = z.object({ type: z.literal("image"), ...image });

const faqBlock = z.object({
  type: z.literal("faq"),
  items: z.array(z.object({ question: text, answer: text })).min(1),
});

const calloutBlock = z.object({
  type: z.literal("callout"),
  text,
});

const quoteBlock = z.object({
  type: z.literal("quote"),
  text,
  attribution: z.string().trim().optional(),
});

const galleryBlock = z.object({
  type: z.literal("gallery"),
  images: z.array(z.object(image)).min(1),
});

const imageTextBlock = z.object({
  type: z.literal("imageText"),
  ...image,
  text,
  side: z.enum(["left", "right"]).optional(),
});

const ctaBlock = z.object({
  type: z.literal("cta"),
  label: text,
  href: z.string().min(1),
  variant: z.enum(["solid", "outline"]).optional(),
});

const dividerBlock = z.object({
  type: z.literal("divider"),
  space: z.enum(["small", "medium", "large"]).optional(),
  rule: z.boolean().optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  headingBlock,
  paragraphBlock,
  listBlock,
  columnsBlock,
  imageBlock,
  faqBlock,
  calloutBlock,
  quoteBlock,
  galleryBlock,
  imageTextBlock,
  ctaBlock,
  dividerBlock,
]);

export const blocksSchema = z.array(blockSchema);

/** The block types the editor offers, in the order its "add" menu lists them. */
export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "list",
  "columns",
  "image",
  "imageText",
  "gallery",
  "callout",
  "quote",
  "faq",
  "cta",
  "divider",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABEL: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Text",
  list: "Bullet list",
  columns: "Star list (two columns)",
  image: "Image",
  imageText: "Image with text",
  gallery: "Gallery",
  callout: "Highlight box",
  quote: "Quote",
  faq: "Questions & answers",
  cta: "Button",
  divider: "Divider",
};

/** One line each, shown in the editor's block picker. */
export const BLOCK_HINT: Record<BlockType, string> = {
  heading: "A section title.",
  paragraph: "A paragraph. Bold, italic and links are available inside it.",
  list: "A plain bulleted or numbered list.",
  columns: "Olive star bullets, filling two columns — used for benefit lists.",
  image: "A single full-width picture.",
  imageText: "A picture beside a paragraph.",
  gallery: "Several pictures in a grid.",
  callout: "The olive box with a quote mark, for one standout sentence.",
  quote: "A pull-quote, optionally with a name under it.",
  faq: "An expanding list of questions.",
  cta: "A button linking somewhere — booking, WhatsApp, another page.",
  divider: "Space, or a line, between sections.",
};

/**
 * Validate on the way in. Throws with the offending block's index named,
 * because "expected string, received number" on its own is unactionable when
 * the body has forty blocks.
 */
export function parseBlocks(value: unknown): ContentBlock[] {
  const parsed = blocksSchema.safeParse(value);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where =
      typeof first?.path[0] === "number" ? ` (block ${first.path[0] + 1})` : "";
    throw new Error(`Invalid content${where}: ${first?.message ?? "unknown"}`);
  }

  return parsed.data as ContentBlock[];
}

/**
 * Validate on the way out, tolerantly.
 *
 * A page that has already been published must not 500 because one block in it
 * is malformed — that turns a content bug into an outage on a URL Google has
 * indexed. Bad blocks are dropped and logged; the rest of the article renders.
 */
export function readBlocks(value: unknown, context = "content"): ContentBlock[] {
  if (!Array.isArray(value)) {
    console.error(`[cms] ${context}: body is not an array`);
    return [];
  }

  const kept: ContentBlock[] = [];

  for (const [index, raw] of value.entries()) {
    const parsed = blockSchema.safeParse(raw);
    if (parsed.success) {
      kept.push(parsed.data as ContentBlock);
    } else {
      console.error(
        `[cms] ${context}: dropped block ${index + 1} — ${
          parsed.error.issues[0]?.message ?? "invalid"
        }`,
      );
    }
  }

  return kept;
}

/** A new block of each type, as the editor inserts it. */
export function emptyBlock(type: BlockType): ContentBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "New heading" };
    case "paragraph":
      return { type: "paragraph", text: "New paragraph." };
    case "list":
      return { type: "list", items: ["First item"] };
    case "columns":
      return { type: "columns", items: ["First point"] };
    case "image":
      return { type: "image", src: "", alt: "", width: 1200, height: 800 };
    case "imageText":
      return {
        type: "imageText",
        src: "",
        alt: "",
        width: 1200,
        height: 800,
        text: "New paragraph.",
        side: "left",
      };
    case "gallery":
      return { type: "gallery", images: [] };
    case "callout":
      return { type: "callout", text: "Something worth pulling out." };
    case "quote":
      return { type: "quote", text: "Something someone said." };
    case "faq":
      return {
        type: "faq",
        items: [{ question: "A question?", answer: "The answer." }],
      };
    case "cta":
      return { type: "cta", label: "Book a session", href: "", variant: "solid" };
    case "divider":
      return { type: "divider", space: "medium", rule: true };
  }
}
