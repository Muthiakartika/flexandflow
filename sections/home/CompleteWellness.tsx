import Image from "next/image";

import { ButtonLink } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

/* Rendered as two columns on the original, splitting after the third item. */
const points = [
  ["Dedicated attention in every session", "Relief from pain and stiffness", "Improved mobility and body function"],
  ["Hands-on care focused on lasting results", "Personalized treatments for every individual"],
];

/**
 * "Complete Wellness" — studio photo with a scalloped bottom edge on the left,
 * copy and clover-bulleted benefits on the right.
 */
export default function CompleteWellness() {
  return (
    <section className="pb-[100px]">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[721fr_603fr] lg:gap-4">
          <Reveal className="relative">
            {/* Faint concentric rings and dots behind the photo. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-[12%] -left-[22%] h-[380px] w-[380px] rounded-full border border-white/70"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-[4%] -left-[12%] h-[240px] w-[240px] rounded-full border border-white/70"
            />

            <Image
              src="/images/2026/06/Complete-Wellness-homepage-new.jpg"
              alt=""
              aria-hidden
              width={1300}
              height={752}
              sizes="(max-width: 1023px) 90vw, 45vw"
              className="section-mask relative h-[401px] w-full object-cover max-[767px]:h-[280px]"
            />
          </Reveal>

          <Reveal delay={120}>
            <SectionHeading
              align="left"
              title="Complete Wellness"
              titleClassName="text-primary"
              description="We provide assisted stretching, sports massage, lymphatic drainage, pregnancy massage, trauma release massage, and cupping therapy. Every session focuses on relieving pain, improving mobility, restoring balance, and supporting overall well-being."
            />

            <div className="mt-8 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {points.map((column, i) => (
                <ul key={i} className="clover-list">
                  {column.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ))}
            </div>

            <div className="mt-9">
              <ButtonLink href="/contact-us">Book Appointment</ButtonLink>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
