/**
 * The per-therapist rate card from the WordPress price list
 * (flexandflow.fit/price-list/), transcribed verbatim on 2026-08-24 — this
 * app no longer links out to that page, so this is the only place these
 * numbers live now. Sessions are priced by who performs them and by length:
 * the same treatment can cost a different amount at 60 vs 90 minutes, and
 * not every therapist offers every treatment (Yuni does not do Assisted
 * Stretching; only Ginny does).
 *
 * Two rows have no service page of their own and exist only here, not in
 * `lib/data/services.ts`: Combo Stretching and Massage, and Traditional
 * Javanese Massage. Neither is on the WordPress services sitemap.
 *
 * Deliberately separate from `lib/data/services.ts` and `lib/pricing.ts`:
 * those feed `npm run check:prices`, which compares marketing tiers against
 * the booking database and fails on disagreement. These rows have no
 * corresponding `ServiceVariant` row to compare against (some of these
 * treatments are not bookable through this app's wizard at all), so folding
 * them in would give that guard something it cannot actually check.
 */
export type PriceListRow = {
  treatment: string;
  minutes: number;
  /** IDR, digits only. */
  amount: number;
};

export type TherapistRateCard = {
  /** Matches `Therapist.slug` in lib/data/therapists.ts. */
  therapistSlug: string;
  rows: PriceListRow[];
};

export const therapistRates: TherapistRateCard[] = [
  {
    therapistSlug: "ginny",
    rows: [
      { treatment: "Trauma Healing", minutes: 90, amount: 1_500_000 },
      { treatment: "Sports Massage", minutes: 60, amount: 750_000 },
      { treatment: "Sports Massage", minutes: 90, amount: 1_000_000 },
      { treatment: "Assisted Stretching", minutes: 60, amount: 750_000 },
      {
        treatment: "Combo Stretching and Massage",
        minutes: 90,
        amount: 1_000_000,
      },
      { treatment: "Lymphatic Drainage", minutes: 60, amount: 750_000 },
      { treatment: "Lymphatic Drainage", minutes: 90, amount: 1_000_000 },
      { treatment: "Man Lymphatic Drainage", minutes: 60, amount: 800_000 },
      { treatment: "Man Lymphatic Drainage", minutes: 90, amount: 1_100_000 },
      { treatment: "Cupping", minutes: 30, amount: 300_000 },
    ],
  },
  {
    therapistSlug: "yuni",
    rows: [
      { treatment: "Lymphatic Drainage", minutes: 60, amount: 500_000 },
      { treatment: "Lymphatic Drainage", minutes: 90, amount: 750_000 },
      { treatment: "Man Lymphatic Drainage", minutes: 60, amount: 600_000 },
      { treatment: "Man Lymphatic Drainage", minutes: 90, amount: 900_000 },
      {
        treatment: "Traditional Javanese Massage",
        minutes: 90,
        amount: 550_000,
      },
      { treatment: "Sports Massage", minutes: 60, amount: 400_000 },
      { treatment: "Sports Massage", minutes: 90, amount: 600_000 },
      { treatment: "Cupping Therapy", minutes: 30, amount: 300_000 },
      {
        treatment: "Combo Stretching and Massage",
        minutes: 90,
        amount: 750_000,
      },
    ],
  },
];
