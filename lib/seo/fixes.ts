/**
 * Exact corrections to the panel's own copy, applied as the page is read.
 *
 * For copy that is wrong today, mostly prices typed into the text before the
 * rates changed. The agency fixes these in code so every correction is
 * reviewed in a pull request; the database is never written, so the panel
 * still shows the old wording while the site serves the corrected one.
 *
 * Replacements quote prices as tokens (`lib/seo/price-tokens.ts`), so a
 * corrected price can never go stale the way the original did.
 *
 * Each fix replaces every occurrence of `find` on its page. `find` is the
 * panel's text exactly, inline markers included. A fix with `row` touches
 * only table cells in rows that start with those cells, for a figure that is
 * right elsewhere on the same page (IDR 600,000 is correct for the men's
 * lymphatic row and wrong for sport massage). If the owner rewrites one of
 * these sentences the fix stops matching and does nothing, and
 * `npm run check:seo <url>` fails on it, which is the signal to delete the
 * fix or move it to the new wording.
 *
 * A page whose copy needed rewriting as a whole has it in `lib/seo/copy`
 * instead, which replaces the panel body before these fixes run.
 */
import { resolvePrices, type PriceBook } from "@/lib/seo/price-tokens";
import type { ContentBlock, Seo } from "@/types";

export type TextFix = {
  find: string;
  replace: string;
  row?: string[];
  /** The panel's figure is still today's rate: the fix keeps it current when
   *  the rate changes, so `check:seo` can confirm only that the row shows a
   *  price, not that the fix applied. */
  stillCurrent?: true;
  /** For the reviewer: what was wrong. */
  why: string;
};

const SPORT_PRICE = "Typed in before sport massage was repriced; now quotes the live rate.";
const TYPED_PRICE = "Typed in as a figure with an as-of date; now quotes the live rate.";

export const PAGE_FIXES: Record<string, TextFix[]> = {
  "/uluwatu-bali/physiotherapy/": [
    { row: ["Sport massage", "60 min"], find: "IDR 400,000", replace: "IDR {{price:sport-massage:60:standard}}", why: SPORT_PRICE },
    { row: ["Sport massage", "90 min"], find: "IDR 600,000", replace: "IDR {{price:sport-massage:90:standard}}", why: SPORT_PRICE },
    {
      find: "a 60-minute sport massage costs IDR 400,000 with a therapist or IDR 750,000 with our master therapist (prices as of 29 October 2026).",
      replace: "a 60-minute sport massage costs IDR {{price:sport-massage:60:standard}} with a therapist or IDR {{price:sport-massage:60:master}} with our master therapist.",
      why: SPORT_PRICE,
    },
  ],
  "/uluwatu-bali/physical-therapist/": [
    { row: ["Sport massage", "60 min"], find: "IDR 400,000", replace: "IDR {{price:sport-massage:60:standard}}", why: SPORT_PRICE },
  ],
  "/injury-guide/common-surfing-injuries/": [
    {
      find: "a 60-minute sport massage costs IDR 400,000 with a therapist or IDR 750,000 with our master therapist, and a 60-minute assisted stretching session costs IDR 500,000 or IDR 750,000 (prices as of 29 October 2026).",
      replace: "a 60-minute sport massage costs IDR {{price:sport-massage:60:standard}} with a therapist or IDR {{price:sport-massage:60:master}} with our master therapist, and a 60-minute assisted stretching session costs IDR {{price:assisted-stretching:60:standard}} or IDR {{price:assisted-stretching:60:master}}.",
      why: SPORT_PRICE,
    },
    {
      find: "A 60-minute sport massage costs IDR 400,000 to IDR 750,000 depending on the therapist (prices as of 29 October 2026).",
      replace: "A 60-minute sport massage costs IDR {{price:sport-massage:60:standard}} to IDR {{price:sport-massage:60:master}} depending on the therapist.",
      why: SPORT_PRICE,
    },
  ],
  "/uluwatu-bali/what-is-a-pregnancy-massage/": [
    {
      find: "a 90-minute pregnancy massage costs IDR 750,000 with a therapist or IDR 1,000,000 with our master therapist, Ginny (prices as of 29 October 2026).",
      replace: "a 90-minute pregnancy massage costs IDR {{price:pregnancy-massage-service:90:standard}} with a therapist or IDR {{price:pregnancy-massage-service:90:master}} with our master therapist, Ginny.",
      why: TYPED_PRICE,
    },
    {
      find: "Prices as of 29 October 2026. Sessions take place at our studio on Jl. Toya Ning II, Ungasan, or at your villa or hotel in the Uluwatu area for an extra home service fee of IDR 100,000.",
      replace: "Sessions take place at our studio on Jl. Toya Ning II, Ungasan, or at your villa or hotel in the Uluwatu area for an extra home service fee of IDR {{fee}}.",
      why: TYPED_PRICE,
    },
    {
      find: "a 90-minute pregnancy massage costs IDR 750,000 with a therapist or IDR 1,000,000 with our master therapist (prices as of 29 October 2026).",
      replace: "a 90-minute pregnancy massage costs IDR {{price:pregnancy-massage-service:90:standard}} with a therapist or IDR {{price:pregnancy-massage-service:90:master}} with our master therapist.",
      why: TYPED_PRICE,
    },
    { row: ["Pregnancy massage, 90 minutes"], find: "IDR 750,000", replace: "IDR {{price:pregnancy-massage-service:90:standard}}", stillCurrent: true, why: TYPED_PRICE },
    { row: ["Pregnancy massage, 90 minutes"], find: "IDR 1,000,000", replace: "IDR {{price:pregnancy-massage-service:90:master}}", stillCurrent: true, why: TYPED_PRICE },
  ],
};

function fix(text: string, fixes: TextFix[]): string {
  return fixes.reduce((out, f) => out.split(f.find).join(f.replace), text);
}

function fixBlock(block: ContentBlock, all: TextFix[]): ContentBlock {
  const anywhere = all.filter((f) => !f.row);
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "callout":
    case "quote":
    case "imageText":
      return { ...block, text: fix(block.text, anywhere) };
    case "list":
    case "columns":
      return { ...block, items: block.items.map((item) => fix(item, anywhere)) };
    case "faq":
      return {
        ...block,
        items: block.items.map((item) => ({
          question: fix(item.question, anywhere),
          answer: fix(item.answer, anywhere),
        })),
      };
    case "table":
      return {
        ...block,
        head: block.head.map((cell) => fix(cell, anywhere)),
        rows: block.rows.map((row) => {
          const scoped = all.filter(
            (f) => !f.row || f.row.every((cell, i) => row[i] === cell),
          );
          return row.map((cell) => fix(cell, scoped));
        }),
      };
    default:
      return block;
  }
}

/**
 * The page with this file's corrections applied to the panel's copy, price
 * tokens in each replacement filled from `prices`.
 */
export function withPageFixes<T extends { seo: Seo; body: ContentBlock[] }>(
  entry: T,
  prices: PriceBook,
): T {
  const fixes = PAGE_FIXES[entry.seo.canonicalPath]?.map((f) => ({
    ...f,
    replace: resolvePrices(f.replace, prices),
  }));
  return fixes
    ? { ...entry, body: entry.body.map((block) => fixBlock(block, fixes)) }
    : entry;
}
