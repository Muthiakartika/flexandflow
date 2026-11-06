/**
 * Each treatment's prices as one menu, for `/price-list/`.
 *
 * Read from the price book (`lib/seo/prices.ts`), the same figures the
 * treatment pages' price menus and price tokens quote, so the two can never
 * disagree. Team sessions come first and Ginny's after, the step up
 * (DESIGN.md, copy rule); where both charge the same (cupping) the session is
 * listed once, with no name.
 */
import { priceKey, type PriceBook, type PriceTier } from "@/lib/seo/price-tokens";
import { homeServiceFeeIdr, homeServiceSlugs } from "@/lib/site";

export type MenuRow = {
  /** "60 minutes", "Combo with massage, 90 minutes". */
  session: string;
  /** "Therapist" or "Ginny"; null when both charge the same. */
  who: string | null;
  studio: number;
  /** The same session at the client's villa, fee included. Null when the
   *  treatment is studio only. */
  villa: number | null;
  /** Charged on top of another session, so shown with a plus. */
  addOn?: true;
};

export type TreatmentMenu = {
  slug: string;
  homeService: boolean;
  rows: MenuRow[];
  /** The lowest team price, for the shortcuts and the booking bar. */
  from: number | null;
};

type Session = { slug: string; minutes: number; label: string };

const LENGTHS = [30, 60, 90];
const TIERS: PriceTier[] = ["STANDARD", "MASTER"];

/* The 90-minute combo has no page of its own; it is booked as stretching. */
const COMBO: Session = {
  slug: "combo-stretching-and-massage",
  minutes: 90,
  label: "Combo with massage, 90 minutes",
};

export function treatmentMenu(slug: string, book: PriceBook): TreatmentMenu {
  const homeService = homeServiceSlugs.has(slug);
  const villaOf = (amount: number) => (homeService ? amount + homeServiceFeeIdr : null);
  const price = (s: Session, tier: PriceTier): number | undefined =>
    book[priceKey(s.slug, tier, s.minutes)];

  const own = LENGTHS.filter((minutes) =>
    TIERS.some((tier) => book[priceKey(slug, tier, minutes)] !== undefined),
  ).map((minutes) => ({
    slug,
    minutes,
    label: slug === "cupping-therapy" ? `On its own, ${minutes} minutes` : `${minutes} minutes`,
  }));
  const sessions = slug === "assisted-stretching" ? [...own, COMBO] : own;

  const rows: MenuRow[] = [];
  for (const tier of TIERS) {
    for (const s of sessions) {
      const amount = price(s, tier);
      if (amount === undefined) continue;
      const same = price(s, "STANDARD") === price(s, "MASTER");
      if (same && tier === "MASTER") continue;
      rows.push({
        session: s.label,
        who: same ? null : tier === "STANDARD" ? "Therapist" : "Ginny",
        studio: amount,
        villa: villaOf(amount),
      });
    }
  }

  /* Added to a massage, cupping is its own price on top; the home service fee
     is per visit, so a villa session does not pay it twice. */
  const cupping = slug === "cupping-therapy" ? book[priceKey(slug, "STANDARD", 30)] : undefined;
  if (cupping !== undefined) {
    rows.push({
      session: "Added to a massage, 30 minutes",
      who: null,
      studio: cupping,
      villa: homeService ? cupping : null,
      addOn: true,
    });
  }

  const team = rows.filter((row) => row.who !== "Ginny" && !row.addOn).map((row) => row.studio);
  const any = rows.filter((row) => !row.addOn).map((row) => row.studio);
  const pool = team.length ? team : any;
  return { slug, homeService, rows, from: pool.length ? Math.min(...pool) : null };
}
