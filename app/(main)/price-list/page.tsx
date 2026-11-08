import type { Metadata } from "next";
import Link from "next/link";

import PriceMenus, { type PriceMenu } from "@/components/content/PriceMenus";
import StickyBookBar from "@/components/content/StickyBookBar";
import TierChooser from "@/components/content/TierChooser";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { H2, LINK, WRAP, BAND } from "@/components/ui/tokens";
import { listPricedServices } from "@/lib/cms/read";
import { treatmentMenu } from "@/lib/price-menus";
import { formatIdr } from "@/lib/pricing";
import { priceKey } from "@/lib/seo/price-tokens";
import { loadPriceBook } from "@/lib/seo/prices";
import { bookingCtaHref, contact, homeServiceFeeIdr, shortHours } from "@/lib/site";
import { TREATMENT_NAMES, TREATMENT_ORDER } from "@/lib/treatments";
import { treatmentMessage } from "@/lib/whatsapp";

const title = "Massage Prices in Uluwatu, Bali | Flex & Flow";
const description =
  "Every Flex & Flow price in one place: sports, lymphatic, pregnancy and cupping massage, " +
  "assisted stretching and trauma healing, at our Ungasan studio or your villa.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/price-list/" },
  openGraph: {
    title,
    description,
    url: "/price-list/",
    type: "article",
    images: ["/images/2026/08/complete-wellness.jpg"],
  },
};

/* One line each on who the treatment is for; the treatment page has the rest. */
const LINES: Record<string, string> = {
  "sport-massage": "Recovery for surfing, training and long days on your feet.",
  "lymphatic-drainage": "Light, rhythmic work for legs that feel heavy or puffy.",
  "lymphatic-detox-massage-for-men": "Lymphatic work with the face, scalp, head and neck added.",
  "pregnancy-massage-service": "Gentle, and positioned for comfort at every stage.",
  "assisted-stretching": "A therapist takes you through the stretches, on their own or with massage.",
  "cupping-therapy": "On its own, or added to a massage.",
  "trauma-healing": "Slow, sustained work for long-held tension. With Ginny, at the studio.",
};

/**
 * The price list: what everything costs, in one place.
 *
 * `/services/` is where someone chooses a treatment, with a photo card for
 * each; this page answers the next question, so it carries no photo cards of
 * its own. Each treatment is one menu of its sessions (`PriceMenus`), team
 * first and Ginny after, with one studio / villa switch for the whole page,
 * a link to the treatment's page and a WhatsApp booking that names it. Then
 * the choice between the team and Ginny, and what a home visit adds.
 *
 * Every figure comes from the price book (`lib/seo/prices.ts`), the same one
 * the treatment pages quote, so a price changed in the booking admin changes
 * here and there together.
 */
export default async function PriceListPage() {
  const [services, book] = await Promise.all([listPricedServices(), loadPriceBook()]);
  const bySlug = new Map(services.map((service) => [service.slug, service]));

  const menus: PriceMenu[] = TREATMENT_ORDER.flatMap((slug) => {
    const service = bySlug.get(slug);
    if (!service) return [];
    const menu = treatmentMenu(slug, book);
    if (!menu.rows.length) return [];
    const name = TREATMENT_NAMES[slug];
    return [
      {
        ...menu,
        name,
        href: service.seo.canonicalPath,
        line: LINES[slug] ?? service.excerpt,
        whatsapp: `${contact.whatsapp}?text=${encodeURIComponent(
          treatmentMessage(name.toLowerCase(), menu.homeService),
        )}`,
      },
    ];
  });

  /* The 60-minute starting prices on the team-or-Ginny cards. */
  const lowest = (tier: "STANDARD" | "MASTER") => {
    const amounts = TREATMENT_ORDER.flatMap((slug) => {
      const amount = book[priceKey(slug, tier, 60)];
      return amount === undefined ? [] : [amount];
    });
    return amounts.length ? Math.min(...amounts) : null;
  };
  const team = lowest("STANDARD");
  const master = lowest("MASTER");

  return (
    <>
      <div data-hero>
        <PageHero
          title="Massage Prices in Uluwatu"
          eyebrow="Price list"
          crumbs={[{ label: "Price List" }]}
          lead="Every treatment and every length, at the studio in Ungasan or at your villa. Our therapists are the standard rate and the easiest to book; Ginny's own sessions are limited, and priced as the step up."
          actions={
            <>
              <ButtonLink href={bookingCtaHref} variant="solid">
                Book Now
              </ButtonLink>
              <ButtonLink href={contact.whatsapp} external>
                WhatsApp Us
              </ButtonLink>
            </>
          }
        />
      </div>

      <section className={`${WRAP} ${BAND}`}>
        <PriceMenus menus={menus} />

        {team !== null && master !== null ? (
          <div className="mt-[clamp(3rem,5vw,4.5rem)]">
            <p className="page-label">Who treats you</p>
            <h2 className={`mt-2 ${H2}`}>Our Therapists, or Ginny</h2>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.7] text-body-text/75">
              Every session follows the approach Ginny built the studio on. Book the team for the
              most open slots; book Ginny when you want her hands specifically.
            </p>
            <div className="prose-flex">
              <TierChooser team={team} master={master} minutes={60} homeService />
            </div>
          </div>
        ) : null}

        <div className="mt-[clamp(3rem,5vw,4.5rem)]">
          <p className="page-label">Home service</p>
          <h2 className={`mt-2 ${H2}`}>At Your Villa</h2>
          <dl className="pl-facts">
            <div>
              <dt>Visit fee</dt>
              <dd>{formatIdr(homeServiceFeeIdr)} per visit, on top of the studio price</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>Ungasan, Pecatu, Bingin, Padang Padang and Balangan</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>{shortHours}</dd>
            </div>
          </dl>
          <p className="mt-4 font-body text-[15px] leading-[1.7] text-body-text/75">
            Trauma healing stays at the studio.{" "}
            <Link href="/uluwatu-bali/outcall-home-service-massage/" className={LINK}>
              How home visits work &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* An hour with the team, as the home page quotes it: the 30-minute
          cupping price would advertise less than a session costs. */}
      <StickyBookBar from={team !== null ? formatIdr(team) : null} />
    </>
  );
}
