import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { assets, contact } from "@/lib/site";
import { therapists } from "@/lib/data/therapists";

/**
 * Home hero, practitioner-led. The studio footage still carries the panel, but
 * the composition is editorial rather than centred: the claim sits low-left at
 * display scale, the two actions sit under it, and the people who will actually
 * do the work are named on the same screen — the page's thesis, stated before
 * any scroll.
 */
export default function Hero() {
  return (
    <section>
      <Container>
        <div className="hero-panel relative overflow-hidden rounded-t-[20px]">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={assets.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />

          {/* The theme washes the footage out; a second, softer pass from the
              lower-left keeps the display type legible over moving frames. */}
          <div aria-hidden className="absolute inset-0 bg-white/50" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-cream)_2%,color-mix(in_oklab,var(--color-cream)_72%,transparent)_26%,transparent_62%)]"
          />

          {/* Bottom padding clears the 100px wave with room to spare, so the
              practitioner strip never crowds the curve when it wraps. */}
          <div className="absolute inset-x-0 top-0 bottom-0 flex items-end pb-[140px] max-[767px]:pb-[132px]">
            <div className="w-full px-[clamp(1.25rem,3.5vw,3.5rem)]">
              <div className="max-w-[19ch]">
                <h1 className="text-[clamp(2.75rem,1.6rem+4.6vw,5.25rem)] leading-[0.94] text-balance">
                  Wellness &amp; Recovery Studio in Uluwatu, Bali
                </h1>
              </div>

              <p className="mt-6 max-w-[54ch] font-body text-[clamp(1rem,0.95rem+0.2vw,1.125rem)] leading-[1.6]">
                Welcome to Flex &amp; Flow, we are a small wellness centre based
                in Uluwatu focused on deep release therapeutic bodywork,
                recovery, and long-term wellness.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
                <ButtonLink href={contact.whatsapp} external variant="solid">
                  Book on WhatsApp
                </ButtonLink>
                <ButtonLink href="/services">See treatments</ButtonLink>
              </div>

              {/* Who will actually be in the room. */}
              <ul className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 max-[479px]:mt-8">
                {therapists.map((therapist) => (
                  <li key={therapist.slug}>
                    <Link
                      href={`/therapist/${therapist.slug}`}
                      className="group flex items-center gap-3"
                    >
                      <Image
                        src={therapist.portrait}
                        alt=""
                        aria-hidden
                        width={200}
                        height={200}
                        sizes="52px"
                        className="h-[52px] w-[52px] shrink-0 rounded-full object-cover object-top ring-1 ring-secondary/15"
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-[26px] leading-[1.05] transition-colors duration-300 group-hover:text-primary">
                          {therapist.name}
                        </span>
                        <span className="block font-body text-[13px] leading-tight text-body-text/70">
                          {therapist.teamRole}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cream wave blending the panel into the page background. */}
          <div
            aria-hidden
            className="hero-wave pointer-events-none absolute inset-x-0 bottom-0 h-[100px]"
          />
        </div>
      </Container>
    </section>
  );
}
