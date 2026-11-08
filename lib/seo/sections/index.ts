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
 * Where a guide's sections go when its own FAQ is not the right place: the
 * panel heading they sit in front of. These guides close on a "what we
 * offer" or prices section, and the sections read better as part of the
 * article before it. Matched on the heading's text, ignoring case; if the
 * owner renames it in the panel, the sections fall back to sitting in front
 * of the FAQ, and `npm run check:seo` with a URL reports it.
 */
export const SECTION_PLACES: Record<string, string> = {
  "/uluwatu-bali/physiotherapy/": "What We Offer at Flex & Flow",
  "/uluwatu-bali/yoga/": "Assisted Stretching at Flex & Flow",
  "/uluwatu-bali/physical-therapist/": "What Flex & Flow Offers",
  "/uluwatu-bali/flexibility-training/": "Assisted Stretching at Flex & Flow",
  "/uluwatu-bali/what-is-a-pregnancy-massage/": "How Much Is a Pregnancy Massage in Uluwatu?",
  "/uluwatu-bali/lymphatic-drainage-massage-what-it-can-do/": "Lymphatic Drainage Prices at Flex & Flow",
};

type Faq = Extract<ContentBlock, { type: "faq" }>;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The headings a page's sections add, in order: the ones a reader sees once
 *  they are placed (an FAQ's own heading is dropped when it is merged). */
export function sectionHeadings(blocks: ContentBlock[]): string[] {
  return blocks.flatMap((block, i) =>
    block.type === "heading" && block.level === 2 && blocks[i + 1]?.type !== "faq" ? [block.text] : [],
  );
}

/**
 * The page's body with its code sections placed in it.
 *
 * A treatment page's body is the agency's own copy, with no FAQ of its own,
 * so the sections simply follow it. A guide's body is the owner's article,
 * which ends on its own "Frequently Asked Questions" and a conclusion.
 * Appended after that, the sections read as a second article after the
 * ending and their questions as a second FAQ. So on a page with an FAQ the
 * sections go in front of it (or of the heading in `SECTION_PLACES`), their
 * questions join its list, and their FAQ heading is dropped: one article,
 * one FAQ, and the owner's conclusion last. A question already in the
 * owner's list is not asked twice.
 */
export function placeSections(body: ContentBlock[], extra: ContentBlock[], place?: string): ContentBlock[] {
  const faqAt = body.findIndex((block) => block.type === "faq");
  if (faqAt === -1) return [...body, ...extra];

  const own = body[faqAt] as Faq;
  const asked = new Set(own.items.map((item) => item.question.trim().toLowerCase()));
  const questions = extra
    .flatMap((block) => (block.type === "faq" ? block.items : []))
    .filter((item) => !asked.has(item.question.trim().toLowerCase()));
  const sections = extra.filter(
    (block, i) => block.type !== "faq" && !(block.type === "heading" && extra[i + 1]?.type === "faq"),
  );
  const merged = body.map((block, i): ContentBlock =>
    i === faqAt ? { type: "faq", items: [...own.items, ...questions] } : block,
  );

  const placeAt = place
    ? merged.findIndex((block, i) => i < faqAt && block.type === "heading" && same(block.text, place))
    : -1;
  const faqHeadingAt = faqAt > 0 && merged[faqAt - 1].type === "heading" ? faqAt - 1 : faqAt;
  const at = placeAt === -1 ? faqHeadingAt : placeAt;

  return [...merged.slice(0, at), ...sections, ...merged.slice(at)];
}

/**
 * The page with its code sections placed in its body (`placeSections`),
 * every price token in them filled from `prices` (see
 * `lib/seo/price-tokens.ts`).
 */
export function withPageSections<T extends { seo: Seo; body: ContentBlock[] }>(
  entry: T,
  prices: PriceBook,
): T {
  const path = entry.seo.canonicalPath;
  const extra = PAGE_SECTIONS[path];
  return extra
    ? {
        ...entry,
        body: placeSections(
          entry.body,
          extra.map((block) => resolveBlockPrices(block, prices)),
          SECTION_PLACES[path],
        ),
      }
    : entry;
}
