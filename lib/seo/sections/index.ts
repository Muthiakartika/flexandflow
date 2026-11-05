/**
 * Extra sections the site appends to treatment and article pages, below the
 * copy the owner edits in the panel.
 *
 * They exist for search: each page gets a few sections and an FAQ aimed at
 * the queries Search Console shows it almost winning, and at the questions
 * AI assistants answer about Bali bodywork. Like `lib/seo/pages.ts` they live
 * in code so every change is reviewed in a pull request before it goes live.
 *
 * One file per page, named by its slug, each exporting a `ContentBlock[]`.
 * They render through `RichText` like any panel block, so the inline format
 * and the "bold and italic never nest" rule are the same. An `faq` block here
 * is part of the page's `FAQPage` structured data, because `lib/cms/read.ts`
 * appends these before the page or its JSON-LD is built.
 *
 * Keys are canonical paths with both slashes, as in `lib/seo/pages.ts`, and
 * the same catch applies: moving a page in the panel orphans its entry.
 * `npm run check:seo` validates every block and every internal link.
 */
import { resolveBlockPrices, type PriceBook } from "@/lib/seo/price-tokens";
import type { ContentBlock, Seo } from "@/types";

import assistedStretching from "./assisted-stretching";
import commonSurfingInjuries from "./common-surfing-injuries";
import cuppingTherapy from "./cupping-therapy";
import flexibilityTraining from "./flexibility-training";
import howToMakeSittingTooLongLessPainful from "./how-to-make-sitting-too-long-less-painful";
import lymphaticDetoxMassageForMen from "./lymphatic-detox-massage-for-men";
import lymphaticDrainageMassageWhatItCanDo from "./lymphatic-drainage-massage-what-it-can-do";
import lymphaticDrainage from "./lymphatic-drainage";
import outcallHomeServiceMassage from "./outcall-home-service-massage";
import physicalTherapist from "./physical-therapist";
import physiotherapy from "./physiotherapy";
import pregnancyMassageService from "./pregnancy-massage-service";
import sportMassage from "./sport-massage";
import traumaHealing from "./trauma-healing";
import whatIsAPregnancyMassage from "./what-is-a-pregnancy-massage";
import yoga from "./yoga";

export const PAGE_SECTIONS: Record<string, ContentBlock[]> = {
  "/uluwatu-bali/assisted-stretching/": assistedStretching,
  "/injury-guide/common-surfing-injuries/": commonSurfingInjuries,
  "/uluwatu-bali/cupping-therapy/": cuppingTherapy,
  "/uluwatu-bali/flexibility-training/": flexibilityTraining,
  "/injury-guide/how-to-make-sitting-too-long-less-painful/": howToMakeSittingTooLongLessPainful,
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": lymphaticDetoxMassageForMen,
  "/uluwatu-bali/lymphatic-drainage-massage-what-it-can-do/": lymphaticDrainageMassageWhatItCanDo,
  "/uluwatu-bali/lymphatic-drainage/": lymphaticDrainage,
  "/uluwatu-bali/outcall-home-service-massage/": outcallHomeServiceMassage,
  "/uluwatu-bali/physical-therapist/": physicalTherapist,
  "/uluwatu-bali/physiotherapy/": physiotherapy,
  "/uluwatu-bali/pregnancy-massage-service/": pregnancyMassageService,
  "/uluwatu-bali/sport-massage/": sportMassage,
  "/uluwatu-bali/trauma-healing/": traumaHealing,
  "/uluwatu-bali/what-is-a-pregnancy-massage/": whatIsAPregnancyMassage,
  "/uluwatu-bali/yoga/": yoga,
};

/**
 * The page with its code sections appended to the body, every price token in
 * them filled from `prices` (see `lib/seo/price-tokens.ts`).
 */
export function withPageSections<T extends { seo: Seo; body: ContentBlock[] }>(
  entry: T,
  prices: PriceBook,
): T {
  const extra = PAGE_SECTIONS[entry.seo.canonicalPath];
  return extra
    ? {
        ...entry,
        body: [...entry.body, ...extra.map((block) => resolveBlockPrices(block, prices))],
      }
    : entry;
}
