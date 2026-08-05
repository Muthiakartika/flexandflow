import Image from "next/image";
import Link from "next/link";

import { serviceBySlug } from "@/lib/data/services";
import { therapists } from "@/lib/data/therapists";
import { contact } from "@/lib/site";

export const metadata = { title: "Preview A — Quiet", robots: { index: false } };

const treatments = [
  "assisted-stretching",
  "sport-massage",
  "lymphatic-drainage",
  "cupping-therapy",
  "trauma-healing",
  "pregnancy-massage-service",
];

/**
 * DIRECTION A — "Quiet".
 *
 * Simple by subtraction. No cards, no panels, no filled blocks: the page is
 * type, photography, and air. Every rule is a hairline, every action is a
 * plain underlined link. The restraint is the design — it reads calm, which is
 * what a recovery studio actually sells.
 */
export default function PreviewA() {
  const services = treatments
    .map((slug) => serviceBySlug.get(slug))
    .filter((s) => s !== undefined);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 max-[640px]:px-5">
      {/* Opening statement — type first, photograph second. */}
      <section className="pt-[clamp(3rem,7vw,6rem)]">
        <p className="font-body text-[14px] tracking-[0.02em] text-body-text/60">
          Uluwatu, Bali
        </p>
        <h1 className="mt-6 max-w-[15ch] text-[clamp(3rem,1.4rem+6.4vw,7rem)] leading-[0.92]">
          Recovery for bodies that work hard.
        </h1>
        <p className="mt-8 max-w-[52ch] font-body text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-[1.65]">
          A small studio for deep-release bodywork, assisted stretching and
          recovery. One therapist, one hour, built around what your body is
          actually asking for.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
          <a
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[17px] underline decoration-1 underline-offset-[7px] transition-colors duration-300 hover:text-primary"
          >
            Book on WhatsApp
          </a>
          <Link
            href="/services"
            className="font-body text-[17px] text-body-text/70 underline decoration-1 underline-offset-[7px] transition-colors duration-300 hover:text-primary"
          >
            Treatments
          </Link>
        </div>
      </section>

      <section className="pt-[clamp(3rem,6vw,5rem)]">
        <Image
          src="/images/2026/06/studio-new.jpg"
          alt="The Flex &amp; Flow studio in Uluwatu"
          width={1600}
          height={900}
          priority
          sizes="100vw"
          className="aspect-[16/9] w-full object-cover max-[640px]:aspect-[4/5]"
        />
      </section>

      {/* Treatments as an index, not tiles. */}
      <section className="pt-[clamp(3.5rem,7vw,6rem)]">
        <h2 className="text-[clamp(1.75rem,1.5rem+1vw,2.5rem)] leading-[1.1]">
          What we do
        </h2>
        <ul className="mt-8">
          {services.map((service) => (
            <li key={service.slug}>
              <Link
                href={`/uluwatu-bali/${service.slug}`}
                className="group flex items-baseline justify-between gap-8 border-t border-secondary/15 py-6"
              >
                <span className="font-display text-[clamp(1.75rem,1.4rem+1.4vw,2.75rem)] leading-[1.1] transition-colors duration-300 group-hover:text-primary">
                  {service.title}
                </span>
                <span className="shrink-0 font-body text-[14px] text-body-text/55 transition-colors duration-300 group-hover:text-primary">
                  View
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The two people, plainly. */}
      <section className="pt-[clamp(3.5rem,7vw,6rem)]">
        <h2 className="text-[clamp(1.75rem,1.5rem+1vw,2.5rem)] leading-[1.1]">
          Who you&rsquo;ll see
        </h2>
        <div className="mt-8 grid gap-10 sm:grid-cols-2">
          {therapists.map((t) => (
            <Link key={t.slug} href={`/therapist/${t.slug}`} className="group">
              <Image
                src={t.portrait}
                alt={t.name}
                width={800}
                height={800}
                sizes="(max-width: 640px) 90vw, 44vw"
                className="aspect-[4/5] w-full object-cover object-top"
              />
              <h3 className="mt-5 text-[clamp(1.75rem,1.5rem+1vw,2.5rem)] leading-[1.1] transition-colors duration-300 group-hover:text-primary">
                {t.name}
              </h3>
              <p className="mt-1 font-body text-[15px] text-body-text/70">
                {t.role}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-secondary/15 mt-[clamp(3.5rem,7vw,6rem)] py-[clamp(3rem,6vw,5rem)]">
        <h2 className="max-w-[16ch] text-[clamp(2rem,1.5rem+2vw,3.5rem)] leading-[1.05]">
          Tell us what hurts.
        </h2>
        <a
          href={contact.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block font-body text-[17px] underline decoration-1 underline-offset-[7px] transition-colors duration-300 hover:text-primary"
        >
          {contact.phone}
        </a>
      </section>
    </div>
  );
}
