/**
 * The figures behind the price tokens in `lib/seo/price-tokens.ts`.
 *
 * A figure comes from the first source that has it, in the order the price
 * list uses: an active booking price row, then the `/price-list` card rows,
 * then the treatment page's own rate card. The cache is expired by the same
 * tags as those three, so the code's copy is never staler than the rate cards
 * beside it: a price changed in the booking admin reaches every section and
 * table that quotes it on the next render.
 */
import "server-only";
import { unstable_cache } from "next/cache";

import { BOOKING_PRICES_TAG, loadTherapistRates } from "@/lib/booking/price-list";
import { joinPublished } from "@/lib/cms/query";
import { toService } from "@/lib/cms/shape";
import { prisma } from "@/lib/db";
import { priceAmount, serviceMinutes, tierMinutes } from "@/lib/pricing";
import { priceKey, type PriceBook, type PriceTier } from "@/lib/seo/price-tokens";

/* `CMS_TAG.services` in `lib/cms/read.ts`, spelled out because that module
   imports this one and the tag is read when this cache is defined. */
const CMS_SERVICES_TAG = "cms:services";

export const loadPriceBook = unstable_cache(
  async (): Promise<PriceBook> => {
    const book: PriceBook = {};

    /* Lowest precedence first; each later source overwrites. */
    const services = (await joinPublished(prisma, { kind: "SERVICE" }, "sortOrder")).map(toService);
    for (const service of services) {
      for (const tier of service.tiers) {
        const amount = priceAmount(tier);
        /* A row with no length of its own sits under the card's one length,
           as `ServicePriceCard` shows it: pregnancy massage's "Therapist" row. */
        const minutes = tierMinutes(service, tier) ?? serviceMinutes(service);
        if (amount !== null && minutes !== null) {
          book[priceKey(service.slug, /master/i.test(tier.label) ? "MASTER" : "STANDARD", minutes)] = amount;
        }
      }
    }

    const [cards, therapists, variants] = await Promise.all([
      loadTherapistRates(),
      prisma.therapist.findMany({ select: { slug: true, tier: true } }),
      prisma.serviceVariant.findMany({
        where: { active: true },
        select: {
          tier: true,
          durationMinutes: true,
          priceIdr: true,
          service: { select: { slug: true } },
        },
      }),
    ]);
    const tierOf = new Map(therapists.map((t) => [t.slug, t.tier as PriceTier]));
    for (const card of cards) {
      const tier = tierOf.get(card.therapistSlug);
      if (!tier) continue;
      for (const row of card.rows) book[priceKey(row.serviceSlug, tier, row.minutes)] = row.amount;
    }
    for (const v of variants) {
      book[priceKey(v.service.slug, v.tier as PriceTier, v.durationMinutes)] = v.priceIdr;
    }

    return book;
  },
  /* Bump the version whenever this function changes: the key is all the data
     cache sees, and an entry built by the old code outlives a deploy. */
  ["seo", "price-book", "v2"],
  { tags: [BOOKING_PRICES_TAG, CMS_SERVICES_TAG] },
);
