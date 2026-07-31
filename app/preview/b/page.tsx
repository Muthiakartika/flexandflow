import Image from "next/image";
import Link from "next/link";

import { serviceBySlug } from "@/lib/data/services";
import { therapists } from "@/lib/data/therapists";
import { contact } from "@/lib/site";

export const metadata = { title: "Preview B — Warm", robots: { index: false } };

const treatments = [
  "assisted-stretching",
  "sport-massage",
  "lymphatic-drainage",
  "cupping-therapy",
];

const answers = [
  { q: "Surfed too hard?", a: "Sports massage or assisted stretching." },
  { q: "Stiff from the desk?", a: "Assisted stretching, then mobility work." },
  { q: "Heavy, puffy legs?", a: "Lymphatic drainage." },
  { q: "Carrying something older?", a: "Trauma release, at your pace." },
];

/**
 * DIRECTION B — "Warm".
 *
 * Casual and human. Soft rounded shapes, conversational copy, photography that
 * bleeds into rounded frames, and a friendly question-and-answer strip instead
 * of a service menu. Nothing sharp, nothing corporate — it should feel like
 * being told what to book by someone who knows you.
 */
export default function PreviewB() {
  const services = treatments
    .map((slug) => serviceBySlug.get(slug))
    .filter((s) => s !== undefined);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-[clamp(1.5rem,3vw,2.5rem)]">
      {/* Hero as one soft photo card with the message sitting inside it. */}
      <section className="relative overflow-hidden rounded-[32px]">
        <Image
          src="/images/2026/06/theraphy-section-with-client-ginny.jpg"
          alt=""
          aria-hidden
          width={1600}
          height={1000}
          priority
          sizes="100vw"
          className="h-[clamp(26rem,46vw,34rem)] w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-cream/72" />
        <div className="absolute inset-0 flex flex-col justify-center px-[clamp(1.5rem,5vw,4.5rem)]">
          <h1 className="max-w-[16ch] text-[clamp(2.5rem,1.5rem+4.4vw,5rem)] leading-[0.98]">
            Feel better than you did yesterday.
          </h1>
          <p className="mt-5 max-w-[44ch] font-body text-[clamp(1rem,0.95rem+0.3vw,1.1875rem)] leading-[1.6]">
            Massage, stretching and recovery in Uluwatu — for surfers, lifters
            and anyone whose body has had enough.
          </p>
          <div className="mt-7">
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-primary px-8 py-4 font-body text-[16px] text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              Message us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Casual triage — the friendliest possible way into a service list. */}
      <section className="pt-[clamp(2.5rem,5vw,4rem)]">
        <h2 className="text-[clamp(1.75rem,1.5rem+1.2vw,2.75rem)] leading-[1.1]">
          What&rsquo;s bothering you?
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {answers.map((item) => (
            <li
              key={item.q}
              className="rounded-[24px] bg-white/70 px-6 py-5"
            >
              <p className="font-display text-[clamp(1.4rem,1.3rem+0.5vw,1.75rem)] leading-[1.15] text-primary">
                {item.q}
              </p>
              <p className="mt-1.5 font-body text-[15px] leading-[1.6]">
                {item.a}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Treatments as soft photo pills. */}
      <section className="pt-[clamp(2.5rem,5vw,4rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[clamp(1.75rem,1.5rem+1.2vw,2.75rem)] leading-[1.1]">
            Popular right now
          </h2>
          <Link
            href="/services"
            className="font-body text-[15px] underline underline-offset-[5px] transition-colors duration-300 hover:text-primary"
          >
            See everything
          </Link>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <li key={service.slug}>
              <Link
                href={`/uluwatu-bali/${service.slug}`}
                className="group block overflow-hidden rounded-[24px] bg-white/70"
              >
                <Image
                  src={service.image}
                  alt=""
                  aria-hidden
                  width={600}
                  height={480}
                  sizes="(max-width: 640px) 90vw, 22vw"
                  className="aspect-[5/4] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
                />
                <span className="block px-5 py-4 font-display text-[1.35rem] leading-[1.2] transition-colors duration-300 group-hover:text-primary">
                  {service.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The people, as a relaxed row. */}
      <section className="pt-[clamp(2.5rem,5vw,4rem)]">
        <div className="rounded-[32px] bg-white/70 p-[clamp(1.5rem,3.5vw,3rem)]">
          <h2 className="text-[clamp(1.75rem,1.5rem+1.2vw,2.75rem)] leading-[1.1]">
            Say hi to the team
          </h2>
          <ul className="mt-7 grid gap-7 sm:grid-cols-2">
            {therapists.map((t) => (
              <li key={t.slug}>
                <Link href={`/therapist/${t.slug}`} className="group flex items-center gap-5">
                  <Image
                    src={t.portrait}
                    alt=""
                    aria-hidden
                    width={300}
                    height={300}
                    sizes="88px"
                    className="h-[88px] w-[88px] shrink-0 rounded-full object-cover object-top"
                  />
                  <span>
                    <span className="block font-display text-[1.9rem] leading-[1.1] transition-colors duration-300 group-hover:text-primary">
                      {t.name}
                    </span>
                    <span className="mt-0.5 block font-body text-[14px] leading-snug text-body-text/70">
                      {t.role}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-[clamp(2.5rem,5vw,4rem)] text-center">
        <h2 className="mx-auto max-w-[18ch] text-[clamp(2rem,1.5rem+2vw,3.25rem)] leading-[1.05]">
          Come in sore. Leave loose.
        </h2>
        <a
          href={contact.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex items-center rounded-full bg-primary px-8 py-4 font-body text-[16px] text-white transition-transform duration-300 hover:-translate-y-0.5"
        >
          Book a session
        </a>
      </section>
    </div>
  );
}
