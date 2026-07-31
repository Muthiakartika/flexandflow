import Image from "next/image";

import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import RichText from "./RichText";
import type { Service } from "@/types";

/**
 * Service detail page body. Measured off the live site: a 20px page gutter plus
 * a 30px article gutter (20px under 768px), around a container that steps
 * 1810px → 1300px → 760px. The banner spans that container, while the running
 * copy sits in a narrower column — see `.service-copy`.
 *
 * Two of the eight services (assisted-stretching, facial-massage) additionally
 * carry a 350px banner showing their own photo. Also verified live: the photo
 * runs unwashed, and the heading the theme places over it is
 * `visibility: hidden` on both — present for heading order, never painted — so
 * it renders here through `.heading-hidden` rather than centred on the image.
 */
export default function ServiceArticle({ service }: { service: Service }) {
  const [firstBlock, ...restBlocks] = service.body;
  const hasBanner = Boolean(service.bannerImage);
  const bannerTitle =
    hasBanner && firstBlock?.type === "heading" ? firstBlock.text : null;
  const body = bannerTitle ? restBlocks : service.body;

  return (
    <>
      <PageHero
        title={service.title}
        crumbs={[
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
      />

      <section className="hero-gap-top px-[50px] pb-[100px] max-[767px]:px-10">
        <div className="service-container">
          {service.bannerImage ? (
            <Reveal className="relative mb-[60px] overflow-hidden rounded-[var(--radius-2x)]">
              <Image
                src={service.bannerImage}
                alt=""
                aria-hidden
                width={1300}
                height={1200}
                sizes="(max-width: 1023px) 90vw, 1300px"
                className="h-[350px] w-full object-cover"
              />
              {bannerTitle ? (
                <h2 className="heading-hidden">{bannerTitle}</h2>
              ) : null}
            </Reveal>
          ) : null}

          <Reveal className="service-copy">
            <RichText blocks={body} />

            <div className="mt-[30px]">
              <ButtonLink href="/contact-us">Book an Appointment</ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
