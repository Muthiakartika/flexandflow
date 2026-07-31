import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { contact } from "@/lib/site";
import { therapists } from "@/lib/data/therapists";

/** Opens WhatsApp with the therapist's name already in the message. */
function bookingHref(name: string) {
  return `${contact.whatsapp}?text=${encodeURIComponent(
    `Hi Flex & Flow, I'd like to book a session with ${name}.`,
  )}`;
}

/**
 * The page's spine. Flex & Flow prices its work by who performs it, so the
 * practitioner is the real decision a visitor makes — this section puts that
 * decision in the open instead of leaving it inside a price card.
 *
 * Rows alternate rather than repeat as matched cards: each person gets a scene
 * photo, their own specialisms, and a direct way to book with them.
 */
export default function Practitioners() {
  return (
    <section className="band">
      <Container>
        <div className="max-w-[24ch]">
          <h2 className="text-[clamp(2.5rem,1.9rem+2.4vw,4rem)] leading-[1.05] text-balance">
            The hands you&rsquo;ll be in
          </h2>
        </div>
        <p className="mt-5 max-w-[62ch] font-body text-[17px] leading-[1.65]">
          Every session is one practitioner working on one body for a full hour.
          Who that is changes the work — so choose the person, not just the
          treatment.
        </p>

        <div className="mt-[clamp(2.5rem,4vw,4rem)] flex flex-col gap-[clamp(2.5rem,4vw,4.5rem)]">
          {therapists.map((therapist, i) => (
            <Reveal key={therapist.slug} delay={i * 90}>
              <article
                className={`grid items-center gap-[clamp(1.75rem,3vw,3.5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,9fr)] ${
                  i % 2 === 1 ? "lg:[&>figure]:order-2" : ""
                }`}
              >
                <figure className="relative">
                  <Image
                    src={therapist.sceneImage}
                    alt={`${therapist.name} working with a client at the studio`}
                    width={1300}
                    height={1200}
                    sizes="(max-width: 1023px) 92vw, 42vw"
                    className="aspect-[5/4] w-full rounded-[var(--radius-2x)] object-cover"
                  />

                  {/* Face anchored to the scene, so the name has someone attached. */}
                  <Image
                    src={therapist.portrait}
                    alt=""
                    aria-hidden
                    width={300}
                    height={300}
                    sizes="104px"
                    className="absolute -bottom-5 right-6 h-[104px] w-[104px] rounded-full border-[6px] border-cream object-cover object-top max-[479px]:h-[76px] max-[479px]:w-[76px]"
                  />
                </figure>

                <div className="min-w-0">
                  <h3 className="text-[clamp(2.25rem,1.9rem+1.4vw,3.25rem)] leading-[1.05]">
                    {therapist.name}
                  </h3>
                  <p className="mt-1 font-body text-[15px] tracking-[0.02em] text-body-text/75">
                    {therapist.role}
                  </p>

                  <p className="mt-5 max-w-[56ch] font-body text-[16px] leading-[1.7]">
                    {therapist.about[0]}
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {therapist.specializedIn.split("•").map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full border border-secondary/15 px-3.5 py-1.5 font-body text-[13px] leading-none text-body-text"
                      >
                        {skill.trim()}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <ButtonLink href={bookingHref(therapist.name)} external>
                      Book with {therapist.name}
                    </ButtonLink>
                    <Link
                      href={`/therapist/${therapist.slug}`}
                      className="font-body text-[15px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary"
                    >
                      Full profile
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
