import type { Metadata } from "next";

import ServicePriceCard from "@/components/cards/ServicePriceCard";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { BAND, LINK, WRAP } from "@/components/ui/tokens";
import { serviceBySlug } from "@/lib/data/services";
import { contact, wordpressUrls } from "@/lib/site";

const description =
  "Check out our services that offer massage, stretching, and therapy to improve mobility and support your health.";

export const metadata: Metadata = {
  title: "Massage and Treatment Services in Uluwatu Bali",
  description,
  alternates: { canonical: "/services/" },
  openGraph: {
    title: "Massage and Treatment Services in Uluwatu Bali",
    description,
    url: "/services/",
    type: "article",
  },
};

/** Priced service cards, in the same order as the WordPress grid. */
const order = [
  "lymphatic-detox-massage-for-men",
  "trauma-healing",
  "assisted-stretching",
  "sport-massage",
  "cupping-therapy",
  "lymphatic-drainage",
  "pregnancy-massage-service",
];

export default function ServicesPage() {
  const services = order
    .map((slug) => serviceBySlug.get(slug))
    .filter((service) => service !== undefined);

  return (
    <>
      <PageHero
        title="Massage & Treatments"
        eyebrow="Come & Explore!"
        crumbs={[{ label: "Services" }]}
        lead="Experience pure relaxation with our range of massages and treatments, thoughtfully designed to rejuvenate your body and mind."
        actions={
          <ButtonLink href={contact.whatsapp} external variant="solid">
            Book on WhatsApp
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        {/* Every card carries both rates, so this grid is the price list in
            miniature; the full one stays on WordPress. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p className="page-label">Every treatment, both tiers, prices in IDR</p>
          <a
            href={wordpressUrls.priceList}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            Full price list
          </a>
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
