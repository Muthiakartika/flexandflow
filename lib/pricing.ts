/**
 * Price and duration normalisation for the service data.
 *
 * The source rows are not uniform and have produced false public prices before:
 * some `price` strings carry an `Rp` prefix and some do not, sessions are not
 * all 60 minutes (cupping is 30, trauma healing 90), and not every service
 * offers both tiers — pregnancy massage's cheaper tier has no `duration` at
 * all. Every figure shown on the site goes through here so a card can never
 * advertise a rate that is not bookable as stated.
 */
import type { Service, TherapistTier } from "@/types";

/** Digits only, so `"Rp 800,000"` and `"750,000"` compare like for like. */
export function priceAmount(tier: TherapistTier): number | null {
  const amount = Number(tier.price.replace(/[^\d]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function formatIdr(amount: number): string {
  return `IDR ${amount.toLocaleString("en-US")}`;
}

/** Reads `"Duration: 60 minutes"`, `"Duration : 1 hr"`, `"1 hr 30 mins"`. */
function minutesIn(text: string | undefined): number | null {
  if (!text) return null;
  const hours = text.match(/(\d+)\s*hr/i);
  const mins = text.match(/(\d+)\s*min/i);
  if (!hours && !mins) return null;
  return (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
}

/** The tier's own length, falling back to the service-level label. */
export function tierMinutes(
  service: Service,
  tier: TherapistTier,
): number | null {
  return minutesIn(tier.duration) ?? minutesIn(service.duration);
}

/** The length shown on a card, when every tier runs the same. */
export function serviceMinutes(service: Service): number | null {
  const lengths = service.tiers.map((tier) => tierMinutes(service, tier));
  const known = lengths.filter((value) => value !== null);
  if (!known.length) return minutesIn(service.duration);
  return known.every((value) => value === known[0]) ? known[0] : null;
}

export type Rate = { label: string; note: string; amount: number };

export type TierRate = Rate & {
  /** Set only when the tiers differ in length; otherwise a card states it once. */
  minutes: number | null;
};

/**
 * A service's tiers as the site shows them: the team first and Ginny's
 * after, with notes that say what the choice is. She is the master
 * therapist and her sessions are the limited ones (DESIGN.md, copy rule);
 * the panel's own notes ("More Affordable") sold the team as the cheap
 * option. Only where the reader has the choice: a treatment with one tier
 * (cupping, trauma healing) keeps the panel's note.
 */
export function teamFirstRates(service: Service): TierRate[] {
  const isGinny = (label: string) => /master/i.test(label);
  const bothTiers =
    service.tiers.some((tier) => isGinny(tier.label)) &&
    service.tiers.some((tier) => !isGinny(tier.label));
  const uniform = serviceMinutes(service);

  const rates = service.tiers.flatMap((tier) => {
    const amount = priceAmount(tier);
    const note = !bothTiers
      ? tier.note.replace(/[()]/g, "")
      : isGinny(tier.label)
        ? "Ginny · limited sessions"
        : "Easiest to book";
    return amount === null
      ? []
      : [{ label: tier.label, note, amount, minutes: uniform ? null : tierMinutes(service, tier) }];
  });
  return rates.sort((a, b) => Number(isGinny(a.label)) - Number(isGinny(b.label)));
}

/** A service's tiers as displayable rates, in source order. */
export function ratesFor(service: Service): Rate[] {
  return service.tiers.flatMap((tier) => {
    const amount = priceAmount(tier);
    return amount === null
      ? []
      : [{ label: tier.label, note: tier.note, amount }];
  });
}

/**
 * The lowest rate the hero may advertise. Restricted to standard 60-minute
 * sessions at services that offer both tiers — a global minimum pulls in
 * single-tier outliers like the 30-minute cupping session and states a price
 * nobody can actually book for an hour of work.
 *
 * Takes the services rather than importing them: this module is otherwise pure
 * functions over one row at a time, and reading the CMS from inside it would
 * make every caller of `priceAmount` depend on a database.
 */
export function lowestHourlyRate(services: Service[]): number | null {
  const amounts = services
    .filter((service) => service.tiers.length > 1)
    .flatMap((service) =>
      service.tiers.flatMap((tier) => {
        const amount = priceAmount(tier);
        if (amount === null) return [];
        return tierMinutes(service, tier) === 60 ? [amount] : [];
      }),
    );

  return amounts.length ? Math.min(...amounts) : null;
}
