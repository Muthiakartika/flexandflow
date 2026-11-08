/**
 * Price tokens: how the code's copy quotes a price without typing it.
 *
 *   {{price:sport-massage:60:standard}}  →  500,000
 *   {{villa:sport-massage:60:master}}    →  850,000 (price + home service fee)
 *   {{fee}}                              →  100,000
 *
 * `lib/seo/sections` and the replacements in `lib/seo/fixes.ts` write these;
 * `lib/seo/prices.ts` loads the figures and `lib/cms/read.ts` fills them in as
 * the page renders. Tiers are `standard` (the "Therapist" rate) and `master`
 * (Ginny). Write "IDR {{price:…}}" in prose; a table cell under a
 * "Price (IDR)" heading takes the bare token.
 *
 * Kept free of `server-only` so `scripts/check-seo.ts` can validate tokens.
 */
import { homeServiceFeeIdr } from "@/lib/site";
import type { ContentBlock } from "@/types";

/** `service-slug|MASTER|60` → IDR. */
export type PriceBook = Record<string, number>;
export type PriceTier = "MASTER" | "STANDARD";

export const priceKey = (slug: string, tier: PriceTier, minutes: number) =>
  `${slug}|${tier}|${minutes}`;

export const PRICE_TOKEN =
  /\{\{(?:(price|villa):([a-z0-9-]+):(\d+):(standard|master)|(fee))\}\}/g;

const idr = (amount: number) => amount.toLocaleString("en-US");

/** What a token nothing can price renders as. Distinctive so checks can find it. */
export const PRICE_MISSING = "(price not listed)";

/**
 * `text` with every price token filled in from `book`.
 *
 * A token nothing can price renders as "(price not listed)" and logs; in
 * development it throws, so localhost shows the mistake at once.
 */
export function resolvePrices(text: string, book: PriceBook): string {
  if (!text.includes("{{")) return text;
  return text.replace(PRICE_TOKEN, (token, kind, slug, minutes, tier, fee) => {
    if (fee) return idr(homeServiceFeeIdr);
    const amount = book[priceKey(slug, tier.toUpperCase() as PriceTier, Number(minutes))];
    if (amount !== undefined) {
      return idr(kind === "villa" ? amount + homeServiceFeeIdr : amount);
    }

    const message = `lib/seo/prices: nothing prices ${token}`;
    if (process.env.NODE_ENV === "development") throw new Error(message);
    console.error(message);
    return PRICE_MISSING;
  });
}

/** A block with every reader-facing string passed through `resolvePrices`. */
export function resolveBlockPrices(block: ContentBlock, book: PriceBook): ContentBlock {
  const fill = (text: string) => resolvePrices(text, book);
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "callout":
    case "quote":
    case "imageText":
      return { ...block, text: fill(block.text) };
    case "list":
    case "columns":
      return { ...block, items: block.items.map(fill) };
    case "table":
      return { ...block, head: block.head.map(fill), rows: block.rows.map((row) => row.map(fill)) };
    case "faq":
      return {
        ...block,
        items: block.items.map((item) => ({
          question: fill(item.question),
          answer: fill(item.answer),
        })),
      };
    case "cta":
      return { ...block, label: fill(block.label) };
    case "gallery":
      return {
        ...block,
        images: block.images.map((image) =>
          image.caption ? { ...image, caption: fill(image.caption) } : image,
        ),
      };
    default:
      return block;
  }
}
