import "server-only";

import { unstable_cache } from "next/cache";

import {
  therapistRates,
  type TherapistRateCard,
} from "@/lib/data/priceList";
import { prisma } from "@/lib/db";

/** Expired by every price-row change in `lib/admin/actions.ts`. */
export const BOOKING_PRICES_TAG = "booking-prices";

/**
 * The `/price-list` rate cards, priced from the admin panel.
 *
 * Which rows each card shows still comes from `lib/data/priceList.ts`; only
 * the figure is replaced. A row is matched to the `ServiceVariant` with the
 * same service slug, the therapist's tier and the same length — an active
 * one first, a retired one second (retiring a row stops it being booked, it
 * does not change what the session costs), and the file's own `amount` when
 * the panel has no such row at all.
 */
export const loadTherapistRates = unstable_cache(
  async (): Promise<TherapistRateCard[]> => {
    const [therapists, variants] = await Promise.all([
      prisma.therapist.findMany({ select: { slug: true, tier: true } }),
      prisma.serviceVariant.findMany({
        select: {
          tier: true,
          durationMinutes: true,
          priceIdr: true,
          active: true,
          service: { select: { slug: true } },
        },
      }),
    ]);

    const tierOf = new Map(therapists.map((t) => [t.slug, t.tier]));
    const prices = new Map<string, { priceIdr: number; active: boolean }>();
    for (const v of variants) {
      const key = `${v.service.slug}|${v.tier}|${v.durationMinutes}`;
      const seen = prices.get(key);
      if (!seen || (v.active && !seen.active)) prices.set(key, v);
    }

    return therapistRates.map((card) => {
      const tier = tierOf.get(card.therapistSlug);
      return {
        ...card,
        rows: card.rows.map((row) => {
          const match = tier
            ? prices.get(`${row.serviceSlug}|${tier}|${row.minutes}`)
            : undefined;
          return match ? { ...row, amount: match.priceIdr } : row;
        }),
      };
    });
  },
  ["price-list", "therapist-rates"],
  { tags: [BOOKING_PRICES_TAG] },
);
