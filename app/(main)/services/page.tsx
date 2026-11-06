import type { Metadata } from "next";

import ServicePriceCard from "@/components/cards/ServicePriceCard";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { BAND, LINK, WRAP } from "@/components/ui/tokens";
import Link from "next/link";

import { listPricedServices } from "@/lib/cms/read";
import { contact } from "@/lib/site";
import { TREATMENT_ORDER } from "@/lib/treatments";

const description =
  "Massage and bodywork in Uluwatu, Bali: sports massage, assisted stretching, lymphatic drainage, cupping, pregnancy massage and home service.";

export const metadata: Metadata = {
  title: "Massage and Treatment Services in Uluwatu Bali",
  description,
  alternates: { canonical: "/services/" },
  openGraph: {
    title: "Massage and Treatment Services in Uluwatu Bali",
    description,
    url: "/services/",
    type: "article",
    images: ["/images/2026/08/private-therapy.jpg"],
  },
};

export default async function ServicesPage() {
  /* In the price list's order, sports massage first and trauma healing last,
     rather than the panel's old WordPress grid order. */
  const rank = (slug: string) => {
    const i = TREATMENT_ORDER.indexOf(slug);
    return i === -1 ? TREATMENT_ORDER.length : i;
  };
  const services = (await listPricedServices()).sort((a, b) => rank(a.slug) - rank(b.slug));

  return (
    <>
      <PageHero
        title="Massage & Treatments"
        eyebrow="Treatments"
        crumbs={[{ label: "Services" }]}
        lead="Hands-on bodywork for bodies that surf, train and travel hard, at the studio in Ungasan or at your villa. Pick what you need; our therapists are the easiest to book, and Ginny's own sessions are the limited step up."
        actions={
          <ButtonLink href={contact.whatsapp} external variant="solid">
            Book on WhatsApp
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        {/* Each card carries its starting rates; every length, the villa
            prices and the add-ons are on the price list. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p className="page-label">Every treatment, prices in IDR</p>
          <Link href="/price-list" className={LINK}>
            Every length and villa price &rarr;
          </Link>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.slug}>
              <ServicePriceCard service={service} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
