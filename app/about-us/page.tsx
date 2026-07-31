import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { therapists } from "@/lib/data/therapists";
import PrivateTherapy from "@/sections/home/PrivateTherapy";

export const metadata: Metadata = {
  title: "About us - Flex and Flow",
  description:
    "Learn more about our mission, values, and the team dedicated to helping you achieve your wellness and flexibility goals. We’re here for you.",
  alternates: { canonical: "/about-us/" },
  openGraph: {
    title: "About us - Flex and Flow",
    description:
      "Learn more about our mission, values, and the team dedicated to helping you achieve your wellness and flexibility goals. We’re here for you.",
    url: "/about-us/",
    type: "article",
  },
};

export default function AboutPage() {
  return (
    <>
      <PageHero title="About us" crumbs={[{ label: "About us" }]} />

      <section className="hero-gap-top pb-[40px]">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Specializing in"
              title="Holistic Bodywork &amp; Healing"
              description="Discover a new level of flexibility and well-being at our studio in Uluwatu, Bali, where expert-assisted stretching services are designed to help you move better and feel lighter!"
            />
          </Reveal>
        </Container>
      </section>

      {/* The About page reuses the home page's therapy section verbatim, with a
          slightly different eyebrow. */}
      <PrivateTherapy eyebrow="Solution For Body Needs" />

      <section className="pb-[100px]">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Our Team"
              title="Meet My Team"
              description="Meet the dedicated professionals team behind your wellness journey. We're here to provide expert care and personalized support every step of the way!"
            />
          </Reveal>

          {/* Two 281px cards centred, with a 242x224 portrait. The original
              renders the working-hours line at font-size 0, so it is omitted. */}
          <div className="mt-12 flex flex-wrap justify-center gap-0">
            {therapists.map((therapist, i) => (
              <Reveal key={therapist.slug} delay={i * 120}>
                <article className="group w-[281px] px-[19px] text-center">
                  <Link
                    href={`/therapist/${therapist.slug}`}
                    title={therapist.name}
                    className="team-mask block overflow-hidden"
                  >
                    <Image
                      src={therapist.portrait}
                      alt={therapist.name}
                      width={1300}
                      height={1200}
                      sizes="242px"
                      className="h-[224px] w-[242px] object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
                    />
                  </Link>

                  <h3 className="mt-5 text-[35.69px] leading-[1.26] max-[479px]:text-[30px]">
                    <Link
                      href={`/therapist/${therapist.slug}`}
                      className="transition-colors duration-300 hover:text-primary"
                    >
                      {therapist.name}
                    </Link>
                  </h3>

                  <h6 className="mt-1 text-[16px] leading-[1.625] text-body-text">
                    {therapist.teamRole}
                  </h6>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
