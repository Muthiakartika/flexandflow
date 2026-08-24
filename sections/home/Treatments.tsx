import Image from "next/image";
import Link from "next/link";

import { serviceBySlug } from "@/lib/data/services";
import { formatIdr, ratesFor, serviceMinutes } from "@/lib/pricing";
import { BAND, CARD, FOCUS, H2, LINK, WRAP } from "@/components/ui/tokens";

/** Treatments featured on the home page, in the original order. */
const featured = [
  "lymphatic-detox-massage-for-men",
  "trauma-healing",
  "assisted-stretching",
  "sport-massage",
  "cupping-therapy",
  "lymphatic-drainage",
];

/**
 * The treatment grid. Every card states its own length and its own rates for
 * both tiers, read from the service data — cupping's 30 minutes and trauma
 * healing's 90 show as themselves rather than being averaged into an hour, and
 * a Master-only treatment simply shows one row.
 */
export default function Treatments() {
  const cards = featured
    .map((slug) => serviceBySlug.get(slug))
    .filter((service) => service !== undefined)
    .map((service) => ({
      service,
      minutes: serviceMinutes(service),
      rates: ratesFor(service),
    }));

  return (
    <section className={`${WRAP} ${BAND}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="page-label">Come &amp; Explore</p>
          <h2 className={`mt-2 ${H2}`}>MORE TREATMENTS FOR&nbsp;YOU</h2>
        </div>
        <Link href="/price-list" className={LINK}>
          Full price list
        </Link>
      </div>

      <p className="mt-4 max-w-[68ch] font-body text-[15px] leading-[1.7] text-body-text/75">
        Experience a variety of services at our wellness and recovery studio in
        Uluwatu. Treatments that are designed to enhance flexibility and
        performance and support your overall wellbeing. Let our experts guide
        you to a healthier, more balanced you.
      </p>

      <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ service, minutes, rates }) => (
          <li key={service.slug}>
            <Link
              href={`/uluwatu-bali/${service.slug}`}
              className={`group flex h-full flex-col overflow-hidden ${CARD} transition-colors duration-300 hover:border-primary/45 ${FOCUS}`}
            >
              <span className="relative block overflow-hidden">
                <Image
                  src={service.image}
                  alt=""
                  aria-hidden
                  width={600}
                  height={420}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
                />
                {minutes ? (
                  <span className="absolute top-3 left-3 rounded-full bg-white/92 px-3 py-1 font-body text-[12px] leading-none tabular-nums backdrop-blur-sm">
                    {minutes} min
                  </span>
                ) : null}
              </span>

              <span className="flex flex-1 flex-col p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-display text-[24px] leading-[1.12] font-bold transition-colors duration-300 group-hover:text-primary">
                    {service.title}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="mt-1 h-4 w-4 shrink-0 text-body-text/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>

                <span className="mt-1.5 line-clamp-2 font-body text-[13px] leading-[1.6] text-body-text/65">
                  {service.excerpt}
                </span>

                <span className="mt-auto block pt-4">
                  {rates.map((rate) => (
                    <span
                      key={rate.label}
                      className="flex items-baseline justify-between gap-3 border-t border-secondary/10 py-2 last:pb-0"
                    >
                      <span className="page-label">{rate.label}</span>
                      <span className="font-body text-[14px] leading-none font-bold tabular-nums">
                        {formatIdr(rate.amount)}
                      </span>
                    </span>
                  ))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
