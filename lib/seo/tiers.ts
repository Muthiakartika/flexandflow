/**
 * Rate-card rows the agency relabels in code, as the page is read.
 *
 * The panel lists cupping under one row, "Master Therapist (Highly
 * Experienced)", which reads as Ginny only; the team gives it at the same
 * price (`lib/data/priceList.ts`, the booking prices). The figure and the
 * length stay the panel's; only the row's label and note change, wherever
 * the site shows them (the treatment page, the Services card, the home
 * page's cards).
 *
 * Applies only while the treatment has that one row. If the owner adds a
 * second row in the panel, this stops applying and the panel's labels show,
 * which is the signal to delete the entry. Keyed by canonical path with both
 * slashes; `npm run check:seo <url>` confirms the label is served.
 */
import type { Seo, Service } from "@/types";

export type TierLabel = { label: string; note: string };

export const TIER_LABELS: Record<string, TierLabel> = {
  "/uluwatu-bali/cupping-therapy/": {
    label: "Any therapist",
    note: "Same price with the team or Ginny",
  },
};

/** The treatment with its one rate-card row relabelled, when listed here. */
export function withTierLabels<T extends { seo: Seo }>(entry: T): T {
  const relabel = TIER_LABELS[entry.seo.canonicalPath];
  if (!relabel || !("tiers" in entry)) return entry;
  const { tiers } = entry as unknown as Service;
  return tiers.length === 1 ? { ...entry, tiers: [{ ...tiers[0], ...relabel }] } : entry;
}
