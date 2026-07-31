import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { services } from "@/lib/data/services";
import { wordpressUrls } from "@/lib/site";

/**
 * Flex & Flow prices every treatment at two levels, but until now that choice
 * only appeared inside the price cards, unexplained. This band states it once,
 * in the open, so the visitor understands what they are choosing between.
 *
 * The "from" figures are derived from the real tier data rather than written in,
 * so they cannot drift out of step with the price list.
 */
const TIER_ORDER = ["Master Therapist", "Therapist"] as const;

/**
 * Only services that offer BOTH tiers may set the floor. Taking a global
 * minimum pulled in single-tier outliers — cupping is Master-only and runs 30
 * minutes, so it produced a "Master from Rp 300,000" that undercut the cheaper
 * tier and did not correspond to any bookable 60-minute session.
 */
const comparableServices = services.filter((service) =>
  TIER_ORDER.every((label) =>
    service.tiers.some((tier) => tier.label === label),
  ),
);

function lowestPriceFor(label: string) {
  const prices = comparableServices
    .flatMap((service) => service.tiers)
    .filter((tier) => tier.label === label)
    .map((tier) => Number(tier.price.replace(/[^\d]/g, "")))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (!prices.length) return null;
  return Math.min(...prices).toLocaleString("en-US");
}

const tiers = TIER_ORDER.map((label) => ({
  label,
  from: lowestPriceFor(label),
})).filter((tier) => tier.from !== null);

export default function Tiers() {
  if (tiers.length < 2) return null;

  return (
    <section className="band band-line">
      <Container>
        <div className="grid gap-[clamp(2rem,4vw,4.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h2 className="max-w-[16ch] text-[clamp(2.25rem,1.8rem+2vw,3.5rem)] leading-[1.05] text-balance">
              Two ways to book
            </h2>
            <p className="mt-5 max-w-[46ch] font-body text-[16px] leading-[1.7]">
              Most treatments can be booked with either an experienced master
              therapist or a therapist, at a lower rate. The difference is
              experience, not the treatment itself.
            </p>
            <a
              href={wordpressUrls.priceList}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block font-body text-[15px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary"
            >
              See the full price list
            </a>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-[var(--radius-2x)] bg-secondary/10 sm:grid-cols-2">
            {tiers.map((tier) => (
              <Reveal key={tier.label} as="div" className="bg-cream p-[clamp(1.5rem,2.4vw,2.25rem)]">
                <dt className="font-display text-[clamp(1.75rem,1.5rem+0.9vw,2.375rem)] leading-[1.1] text-primary">
                  {tier.label}
                </dt>
                <dd className="mt-2 font-body text-[15px] leading-[1.6] text-body-text/70">
                  {tier.label === "Master Therapist"
                    ? "Our most experienced hands, for injury work and anything you want assessed properly."
                    : "The same treatments and the same hour, at a more affordable rate."}
                </dd>
                <dd className="mt-6 font-body text-[14px] tracking-[0.04em] text-body-text/70 uppercase">
                  From
                </dd>
                <dd className="font-display text-[clamp(2rem,1.7rem+1.2vw,2.75rem)] leading-[1.1]">
                  Rp&nbsp;{tier.from}
                </dd>
                <dd className="mt-1 font-body text-[14px] text-body-text/70">
                  Most sessions run 60 minutes
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
