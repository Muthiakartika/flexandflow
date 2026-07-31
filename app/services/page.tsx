import type { Metadata } from "next";

import ServicePriceCard from "@/components/cards/ServicePriceCard";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { serviceBySlug } from "@/lib/data/services";

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
      <PageHero title="Services" crumbs={[{ label: "Services" }]} />

      <section className="hero-gap-top pb-[80px]">
        <Container>
          <Reveal>
            <SectionHeading
            eyebrow="Come &amp; Explore!"
            title="Massage &Treatments"
            description="Experience pure relaxation with our range of massages and treatments, thoughtfully designed to rejuvenate your body and mind."
          />
          </Reveal>

          {/* `h-full` on the reveal and the card so they stretch to a common
              row height, as the original's grid does. */}
          <div className="mt-10 grid gap-6 min-[769px]:grid-cols-2 min-[1201px]:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.slug} delay={(i % 3) * 120} className="h-full">
                <ServicePriceCard service={service} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
