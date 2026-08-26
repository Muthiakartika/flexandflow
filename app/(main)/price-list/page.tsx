import type { Metadata } from "next";
import Image from "next/image";

import ServicePriceCard from "@/components/cards/ServicePriceCard";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { PendingLink } from "@/components/ui/PendingLink";
import { BAND, CARD, FOCUS, H2, WRAP } from "@/components/ui/tokens";
import { pricedServiceSlugs, serviceBySlug } from "@/lib/data/services";
import { therapistBySlug } from "@/lib/data/therapists";
import { therapistRates } from "@/lib/data/priceList";
import { formatIdr } from "@/lib/pricing";
import { externalBookingUrl } from "@/lib/site";

const pricedServices = pricedServiceSlugs
  .map((slug) => serviceBySlug.get(slug))
  .filter((service) => service !== undefined);

/** Title and description are WordPress's, verbatim — matched against the
 *  live `/price-list/` page on 2026-08-26, same rule as every other page. */
const title = "Wellness Therapy Price List - Uluwatu, Bali";
const description =
  "Check out our price list for all services offered. Find the perfect " +
  "treatment to enhance your overall wellness at an affordable price.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/price-list/" },
  openGraph: {
    title,
    description,
    url: "/price-list/",
    type: "article",
  },
};

/**
 * The price list, moved in from WordPress. That page ran a plain HTML table;
 * this reuses the rate-card language the rest of the redesign already
 * established (`ServiceArticle`'s sticky aside, `TherapistCard`'s portrait)
 * rather than cloning the table.
 */
export default function PriceListPage() {
  return (
    <>
      <PageHero
        title="Price List"
        eyebrow="Every Session, Every Rate"
        crumbs={[{ label: "Price List" }]}
        lead="Rates are set by who performs the session and how long it runs. Ginny is the Master Therapist rate; Yuni is the more affordable one."
        actions={
          <ButtonLink href={externalBookingUrl} external variant="solid">
            Book Now
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid gap-5 lg:grid-cols-2">
          {therapistRates.map((card) => {
            const therapist = therapistBySlug.get(card.therapistSlug);
            if (!therapist) return null;

            return (
              <div key={card.therapistSlug} className={`${CARD} p-5`}>
                {/* Pulled up over the card's own top edge with a negative
                    margin rather than absolute positioning — it stays a
                    normal flex sibling of the name, just taller than the row
                    around it, and a white ring reads as the card's own edge
                    rather than a random circle floating on the page. */}
                <div className="flex items-center gap-4">
                  <Image
                    src={therapist.portrait}
                    alt={therapist.name}
                    width={200}
                    height={200}
                    sizes="80px"
                    className="-mt-12 h-20 w-20 shrink-0 rounded-full object-cover object-top ring-4 ring-white"
                  />
                  <div className="min-w-0">
                    <h2 className="font-display text-[24px] leading-none font-bold">
                      {therapist.name}
                    </h2>
                    <p className="mt-1.5 font-body text-[13px] leading-none text-body-text/65">
                      {therapist.teamRole}
                    </p>
                  </div>
                </div>

                <dl className="mt-4">
                  {card.rows.map((row) => (
                    <div
                      key={`${row.treatment}-${row.minutes}`}
                      className="flex items-baseline justify-between gap-4 border-t border-secondary/10 py-2.5"
                    >
                      <dt>
                        <span className="page-label block">{row.treatment}</span>
                        <span className="mt-1 block font-body text-[12px] leading-none text-body-text/55">
                          {row.minutes} min
                        </span>
                      </dt>
                      <dd className="font-body text-[15px] leading-none font-bold tabular-nums">
                        {formatIdr(row.amount)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <PendingLink
                  href={`/therapist/${therapist.slug}`}
                  className={`group/link mt-4 inline-flex items-center gap-1.5 rounded-[10px] border border-secondary/20 px-4 py-2.5 font-body text-[13px] leading-none transition-colors duration-300 hover:border-primary hover:text-primary ${FOCUS}`}
                >
                  Full profile
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover/link:translate-x-0.5"
                  >
                    &rarr;
                  </span>
                </PendingLink>
              </div>
            );
          })}
        </div>

        <p className="mt-6 max-w-[62ch] font-body text-[13px] leading-[1.7] text-body-text/60">
          Home service is available exclusively in the Uluwatu area. Two
          treatments above — Combo Stretching and Massage, and Traditional
          Javanese Massage — are priced by therapist only; every other
          treatment is broken down below.
        </p>

        {/* One `page-band` covers the whole page below the hero; a second one
            here would stack its own top-and-bottom padding onto this block's,
            doubling the gap to something the page-band rhythm never intends
            between two sections that are really one story. This margin is
            the internal beat instead — noticeably smaller than a full band. */}
        <div className="mt-[clamp(2.5rem,4vw,3.5rem)]">
          <p className="page-label">Our Prices</p>
          <h2 className={`mt-2 ${H2}`}>Pick Your Treatment</h2>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pricedServices.map((service) => (
              <li key={service.slug}>
                <ServicePriceCard service={service} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
