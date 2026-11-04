/**
 * The per-therapist rate card from the WordPress price list
 * (flexandflow.fit/price-list/), transcribed verbatim on 2026-08-24 — this
 * app no longer links out to that page, so this is the only place these
 * numbers live now. Sessions are priced by who performs them and by length:
 * the same treatment can cost a different amount at 60 vs 90 minutes, and
 * not every therapist offers every treatment (Yuni does not do Assisted
 * Stretching; only Ginny does).
 *
 * One row has no service page of its own and exists only here, not in
 * `lib/data/services.ts`: Combo Stretching and Massage. It is not on the
 * WordPress services sitemap.
 *
 * Deliberately separate from `lib/data/services.ts` and `lib/pricing.ts`:
 * those feed `npm run check:prices`, and several of these rows have no
 * `ServiceVariant` to compare against.
 *
 * Since 2026-11-04 this file decides *which* rows each card shows; the
 * *price* comes from the admin panel's Booking prices wherever a matching
 * row exists (`lib/booking/price-list.ts`), and `amount` is the fallback.
 */
export type PriceListRow = {
  treatment: string;
  /**
   * The `Service.slug` whose booking price row (at this therapist's tier and
   * this length) supplies the figure. `combo-stretching-and-massage` has no
   * service yet; creating one under that name in the admin panel picks it up.
   */
  serviceSlug: string;
  minutes: number;
  /**
   * IDR, digits only. Only a fallback since 2026-11-04: `/price-list` shows
   * the booking price from the admin panel wherever one exists, and this
   * figure only where none does. See `lib/booking/price-list.ts`.
   */
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
      {
        treatment: "Trauma Healing",
        serviceSlug: "trauma-healing",
        minutes: 90,
        amount: 1_800_000,
      },
      {
        treatment: "Sport Massage",
        serviceSlug: "sport-massage",
        minutes: 60,
        amount: 750_000,
      },
      {
        treatment: "Sport Massage",
        serviceSlug: "sport-massage",
        minutes: 90,
        amount: 1_000_000,
      },
      {
        treatment: "Assisted Stretching",
        serviceSlug: "assisted-stretching",
        minutes: 60,
        amount: 750_000,
      },
      {
        treatment: "Combo Stretching and Massage",
        serviceSlug: "combo-stretching-and-massage",
        minutes: 90,
        amount: 1_000_000,
      },
      {
        treatment: "Lymphatic Drainage",
        serviceSlug: "lymphatic-drainage",
        minutes: 60,
        amount: 750_000,
      },
      {
        treatment: "Lymphatic Drainage",
        serviceSlug: "lymphatic-drainage",
        minutes: 90,
        amount: 1_000_000,
      },
      {
        treatment: "Man Lymphatic Drainage",
        serviceSlug: "lymphatic-detox-massage-for-men",
        minutes: 60,
        amount: 800_000,
      },
      {
        treatment: "Man Lymphatic Drainage",
        serviceSlug: "lymphatic-detox-massage-for-men",
        minutes: 90,
        amount: 1_100_000,
      },
      {
        treatment: "Cupping",
        serviceSlug: "cupping-therapy",
        minutes: 30,
        amount: 300_000,
      },
    ],
  },
  {
    therapistSlug: "yuni",
    rows: [
      {
        treatment: "Lymphatic Drainage",
        serviceSlug: "lymphatic-drainage",
        minutes: 60,
        amount: 500_000,
      },
      {
        treatment: "Lymphatic Drainage",
        serviceSlug: "lymphatic-drainage",
        minutes: 90,
        amount: 750_000,
      },
      {
        treatment: "Man Lymphatic Drainage",
        serviceSlug: "lymphatic-detox-massage-for-men",
        minutes: 60,
        amount: 600_000,
      },
      {
        treatment: "Man Lymphatic Drainage",
        serviceSlug: "lymphatic-detox-massage-for-men",
        minutes: 90,
        amount: 900_000,
      },
      {
        treatment: "Sport Massage",
        serviceSlug: "sport-massage",
        minutes: 60,
        amount: 400_000,
      },
      {
        treatment: "Sport Massage",
        serviceSlug: "sport-massage",
        minutes: 90,
        amount: 600_000,
      },
      {
        treatment: "Cupping Therapy",
        serviceSlug: "cupping-therapy",
        minutes: 30,
        amount: 300_000,
      },
      {
        treatment: "Combo Stretching and Massage",
        serviceSlug: "combo-stretching-and-massage",
        minutes: 90,
        amount: 750_000,
      },
    ],
  },
];
