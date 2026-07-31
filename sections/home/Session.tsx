import Image from "next/image";

import BenefitIcon, {
  benefitLabels,
  type BenefitIconName,
} from "@/components/ui/BenefitIcon";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";

const benefits = Object.keys(benefitLabels) as BenefitIconName[];

/* The studio's own description of what every session is aimed at. */
const outcomes = [
  "Dedicated attention in every session",
  "Relief from pain and stiffness",
  "Improved mobility and body function",
  "Hands-on care focused on lasting results",
  "Personalized treatments for every individual",
];

/**
 * What the hour is actually for. The studio photo carries the left, the four
 * benefit glyphs run as a band beneath the copy — the same icons the theme
 * already owns, given room to read rather than boxed into tiles.
 */
export default function Session() {
  return (
    <section className="band band-line">
      <Container>
        <div className="grid items-center gap-[clamp(2rem,4vw,4rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]">
          <Reveal>
            <Image
              src="/images/2026/06/Complete-Wellness-homepage-new.jpg"
              alt="A treatment in progress at the Flex &amp; Flow studio"
              width={1300}
              height={752}
              sizes="(max-width: 1023px) 92vw, 42vw"
              className="aspect-[4/3] w-full rounded-[var(--radius-2x)] object-cover"
            />
          </Reveal>

          <Reveal delay={110}>
            <h2 className="max-w-[18ch] text-[clamp(2.25rem,1.8rem+2vw,3.5rem)] leading-[1.05] text-balance">
              Built around your body, not a menu
            </h2>

            <p className="mt-5 max-w-[58ch] font-body text-[17px] leading-[1.7]">
              We provide assisted stretching, sports massage, lymphatic
              drainage, pregnancy massage, trauma release massage, and cupping
              therapy. Every session focuses on relieving pain, improving
              mobility, restoring balance, and supporting overall well-being.
            </p>

            <ul className="clover-list mt-7 max-w-[52ch]">
              {outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        <ul className="mt-[clamp(2.5rem,4vw,4rem)] grid gap-x-8 gap-y-7 border-t border-secondary/12 pt-[clamp(1.75rem,3vw,2.5rem)] sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((name, i) => (
            <Reveal key={name} as="li" delay={i * 70}>
              <span className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-4">
                <span className="text-primary">
                  <BenefitIcon name={name} className="h-[46px] w-[46px]" />
                </span>
                <span className="font-display text-[clamp(1.4rem,1.3rem+0.4vw,1.65rem)] leading-[1.15]">
                  {benefitLabels[name]}
                </span>
              </span>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
