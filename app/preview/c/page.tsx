import Image from "next/image";
import Link from "next/link";

import { serviceBySlug } from "@/lib/data/services";
import { therapists } from "@/lib/data/therapists";
import { contact, workingHours } from "@/lib/site";

export const metadata = { title: "Preview C — Clear", robots: { index: false } };

const treatments = [
  "assisted-stretching",
  "sport-massage",
  "lymphatic-drainage",
  "cupping-therapy",
  "trauma-healing",
  "lymphatic-detox-massage-for-men",
];

/**
 * Some price strings in the data already carry an "Rp" prefix and some don't,
 * so normalise to digits and reformat. Duration travels with the price — the
 * treatments do not all run the same length, and a bare column of numbers
 * would imply they do.
 */
function masterRate(slug: string) {
  const tier = serviceBySlug
    .get(slug)
    ?.tiers.find((t) => t.label === "Master Therapist");
  if (!tier) return null;

  const amount = Number(tier.price.replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const minutes = tier.duration?.match(/(\d+)\s*min/i)?.[1];
  return {
    price: `Rp ${amount.toLocaleString("en-US")}`,
    minutes: minutes ? `${minutes} min` : null,
  };
}

/**
 * DIRECTION C — "Clear".
 *
 * Modern and structural. A tight split hero, one strong horizontal rule system,
 * and a treatment table that shows real prices instead of hiding them behind a
 * click. Simple here means legible: everything a visitor needs to decide is on
 * one screen-length, in a grid they can scan.
 */
export default function PreviewC() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 max-[640px]:px-5">
      {/* Split hero: claim left, evidence right. */}
      <section className="grid items-center gap-[clamp(2rem,4vw,4rem)] py-[clamp(2.5rem,5vw,4.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div>
          <h1 className="max-w-[14ch] text-[clamp(2.75rem,1.6rem+4.6vw,4.75rem)] leading-[0.98]">
            Bodywork that keeps you training.
          </h1>
          <p className="mt-6 max-w-[46ch] font-body text-[clamp(1rem,0.95rem+0.3vw,1.125rem)] leading-[1.65]">
            Assisted stretching, sports massage and recovery therapy in Uluwatu.
            Assessed one-to-one, booked the same day.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-[10px] bg-primary px-7 py-3.5 font-body text-[16px] text-white transition-colors duration-300 hover:bg-[#6d7932]"
            >
              Book on WhatsApp
            </a>
            <Link
              href="/services"
              className="inline-flex items-center rounded-[10px] border border-secondary/20 px-7 py-3.5 font-body text-[16px] transition-colors duration-300 hover:border-primary hover:text-primary"
            >
              All treatments
            </Link>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-secondary/15 pt-6 sm:grid-cols-3">
            <div>
              <dt className="font-body text-[13px] text-body-text/60">Open</dt>
              <dd className="mt-0.5 font-body text-[15px]">
                {workingHours[0].days}
              </dd>
            </div>
            <div>
              <dt className="font-body text-[13px] text-body-text/60">Hours</dt>
              <dd className="mt-0.5 font-body text-[15px]">
                {workingHours[0].hours}
              </dd>
            </div>
            <div>
              <dt className="font-body text-[13px] text-body-text/60">Also</dt>
              <dd className="mt-0.5 font-body text-[15px]">Home visits</dd>
            </div>
          </dl>
        </div>

        <Image
          src="/images/2026/05/theraphy-section-fauzan.jpg"
          alt="A recovery session at the Flex &amp; Flow studio"
          width={1200}
          height={1000}
          priority
          sizes="(max-width: 1023px) 92vw, 52vw"
          className="aspect-[6/5] w-full rounded-[16px] object-cover"
        />
      </section>

      {/* Prices in the open — the strongest thing a decision-stage page can do. */}
      <section className="border-t border-secondary/15 py-[clamp(2.5rem,5vw,4rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[clamp(1.75rem,1.5rem+1.2vw,2.75rem)] leading-[1.1]">
            Treatments &amp; rates
          </h2>
          <p className="font-body text-[14px] text-body-text/60">
            From, with a master therapist
          </p>
        </div>

        <ul className="mt-7">
          {treatments.map((slug) => {
            const service = serviceBySlug.get(slug);
            if (!service) return null;
            const rate = masterRate(slug);
            return (
              <li key={slug}>
                <Link
                  href={`/uluwatu-bali/${slug}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-secondary/12 py-5 transition-colors duration-300 hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-[clamp(1.4rem,1.25rem+0.7vw,1.9rem)] leading-[1.15] transition-colors duration-300 group-hover:text-primary">
                      {service.title}
                    </span>
                    <span className="mt-1 line-clamp-1 block font-body text-[14px] text-body-text/65">
                      {service.excerpt}
                    </span>
                  </span>
                  {rate ? (
                    <span className="shrink-0 text-right">
                      <span className="block font-body text-[15px] tabular-nums">
                        {rate.price}
                      </span>
                      {rate.minutes ? (
                        <span className="block font-body text-[13px] text-body-text/60">
                          {rate.minutes}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="shrink-0 font-body text-[15px] text-body-text/60">
                      See page
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Team, compact and factual. */}
      <section className="border-t border-secondary/15 py-[clamp(2.5rem,5vw,4rem)]">
        <h2 className="text-[clamp(1.75rem,1.5rem+1.2vw,2.75rem)] leading-[1.1]">
          Your therapists
        </h2>
        <ul className="mt-7 grid gap-8 sm:grid-cols-2">
          {therapists.map((t) => (
            <li key={t.slug}>
              <Link href={`/therapist/${t.slug}`} className="group flex gap-5">
                <Image
                  src={t.portrait}
                  alt=""
                  aria-hidden
                  width={400}
                  height={400}
                  sizes="120px"
                  className="h-[120px] w-[120px] shrink-0 rounded-[12px] object-cover object-top"
                />
                <span className="min-w-0">
                  <span className="block font-display text-[1.9rem] leading-[1.1] transition-colors duration-300 group-hover:text-primary">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block font-body text-[14px] text-body-text/70">
                    {t.role}
                  </span>
                  <span className="mt-2 line-clamp-2 block font-body text-[14px] leading-[1.6] text-body-text/80">
                    {t.specializedIn}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-secondary/15 py-[clamp(2.5rem,5vw,4rem)]">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h2 className="max-w-[20ch] text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)] leading-[1.05]">
            Book a session for this week.
          </h2>
          <a
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-[10px] bg-primary px-7 py-3.5 font-body text-[16px] text-white transition-colors duration-300 hover:bg-[#6d7932]"
          >
            Book on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
