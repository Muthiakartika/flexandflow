/**
 * Pages whose copy the agency writes in code, in place of the panel's.
 *
 * For a page where the panel's text needed rewriting as a whole rather than
 * correcting a sentence at a time (`lib/seo/fixes.ts` does that). The entry
 * replaces the panel's lead (`excerpt`, shown under the hero heading and on
 * the treatment cards) and the whole of its body; `lib/seo/sections` are
 * still appended after it, and `lib/seo/pages.ts` still sets the title, the
 * description and the H1. The database is never written, so the panel keeps
 * showing the old copy for these pages, and editing it there changes nothing
 * on the site. Every change to the live copy is a pull request.
 *
 * One file per page, named by its slug, keyed by canonical path with both
 * slashes. Blocks render through `RichText` like any panel block and may use
 * price tokens (`lib/seo/price-tokens.ts`). `npm run check:seo` validates
 * them as it does the sections, and with a URL checks the code copy is what
 * is served.
 */
import { resolveBlockPrices, resolvePrices, type PriceBook } from "@/lib/seo/price-tokens";
import type { ContentBlock, Seo } from "@/types";

import assistedStretching from "./assisted-stretching";
import cuppingTherapy from "./cupping-therapy";
import lymphaticDetoxMassageForMen from "./lymphatic-detox-massage-for-men";
import lymphaticDrainage from "./lymphatic-drainage";
import outcallHomeServiceMassage from "./outcall-home-service-massage";
import pregnancyMassageService from "./pregnancy-massage-service";
import sportMassage from "./sport-massage";
import traumaHealing from "./trauma-healing";

export type PageCopy = {
  /** Replaces the panel's excerpt. Left out, the panel's stays. */
  excerpt?: string;
  body: ContentBlock[];
};

export const PAGE_COPY: Record<string, PageCopy> = {
  "/uluwatu-bali/assisted-stretching/": assistedStretching,
  "/uluwatu-bali/cupping-therapy/": cuppingTherapy,
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": lymphaticDetoxMassageForMen,
  "/uluwatu-bali/lymphatic-drainage/": lymphaticDrainage,
  "/uluwatu-bali/outcall-home-service-massage/": outcallHomeServiceMassage,
  "/uluwatu-bali/pregnancy-massage-service/": pregnancyMassageService,
  "/uluwatu-bali/sport-massage/": sportMassage,
  "/uluwatu-bali/trauma-healing/": traumaHealing,
};

/** The page with its code copy in place of the panel's, price tokens filled. */
export function withPageCopy<T extends { seo: Seo; excerpt: string; body: ContentBlock[] }>(
  entry: T,
  prices: PriceBook,
): T {
  const copy = PAGE_COPY[entry.seo.canonicalPath];
  return copy
    ? {
        ...entry,
        excerpt: copy.excerpt ? resolvePrices(copy.excerpt, prices) : entry.excerpt,
        body: copy.body.map((block) => resolveBlockPrices(block, prices)),
      }
    : entry;
}
