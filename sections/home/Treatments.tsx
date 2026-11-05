import Image from "next/image";
import Link from "next/link";

import { CARD, FOCUS, H2, LINK, WRAP } from "@/components/ui/tokens";
import { formatIdr, ratesFor, serviceMinutes } from "@/lib/pricing";
import type { Service } from "@/types";

/* Ordered by how many Google reviews name each treatment
   (`lib/seo/reviews.ts`). The men's lymphatic session shares drainage's
   count, so it follows the others rather than opening the row with two
   lymphatic cards. */
const featured = [
  "lymphatic-drainage",
  "assisted-stretching",
  "sport-massage",
  "lymphatic-detox-massage-for-men",
  "cupping-therapy",
  "trauma-healing",
];

/** The team's lowest rate first, then Ginny's: the order the treatment pages
 *  use (DESIGN.md, copy rule). A Master-only treatment shows Ginny's alone. */
function whoAndWhat(service: Service) {
  const rates = ratesFor(service);
  const lowest = (ginny: boolean) => {
    const amounts = rates
      .filter((rate) => /master/i.test(rate.label) === ginny)
      .map((rate) => rate.amount);
    return amounts.length ? Math.min(...amounts) : null;
  };
  return [
    { who: "With the team", amount: lowest(false) },
    { who: "With Ginny", amount: lowest(true) },
  ].filter((row): row is { who: string; amount: number } => row.amount !== null);
}

/**
 * The treatments, as photo cards that state their own length and both rates.
 * A swipeable row on a phone, running to the screen's edge with the next card
 * peeking in, and a three-column grid from 1024px (`.home-deck` in
 * `home.css`). Six cards stacked on a phone ran to 2,700px.
 */
export default function Treatments({ services }: { services: Service[] }) {
  const bySlug = new Map(services.map((s) => [s.slug, s]));
  const cards = featured
    .map((slug) => bySlug.get(slug))
    .filter((service) => service !== undefined);

  return (
    <section className={`${WRAP} home-band`} aria-labelledby="home-treatments">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="page-label">Treatments</p>
          <h2 id="home-treatments" className={`mt-2 ${H2}`}>
            What We Work On
          </h2>
          <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[1.7] text-body-text/75">
            One to one, priced per session, and most of them at your villa too.
          </p>
        </div>
        <Link href="/price-list" className={`${LINK} shrink-0`}>
          Full price list &rarr;
        </Link>
      </div>

      <ul className="home-deck">
        {cards.map((service) => {
          const minutes = serviceMinutes(service);
          return (
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
                    height={450}
                    sizes="(max-width: 639px) 80vw, (max-width: 1023px) 46vw, 440px"
                    className="home-deck-img aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                  {minutes ? (
                    <span className="absolute top-3 left-3 rounded-full bg-white/92 px-3 py-1 font-body text-[12px] leading-none tabular-nums backdrop-blur-sm">
                      {minutes} min
                    </span>
                  ) : null}
                </span>

                <span className="flex flex-1 flex-col p-4">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-display text-[26px] leading-[1.02] font-bold transition-colors duration-300 group-hover:text-primary">
                      {service.title}
                    </span>
                    <Arrow />
                  </span>

                  <span className="mt-2 line-clamp-2 font-body text-[13.5px] leading-[1.6] text-body-text/65">
                    {service.excerpt}
                  </span>

                  <span className="mt-auto block pt-4">
                    {whoAndWhat(service).map((row) => (
                      <span
                        key={row.who}
                        className="flex items-baseline justify-between gap-3 border-t border-secondary/10 py-2 last:pb-0"
                      >
                        <span className="font-body text-[13px] text-body-text/65">{row.who}</span>
                        <span className="font-body text-[14px] leading-none font-bold tabular-nums">
                          {formatIdr(row.amount)}
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The round olive arrow the treatment pages' cards end on; it fills on hover. */
function Arrow() {
  return (
    <span
      aria-hidden
      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/40 text-primary transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
    >
      <svg
        viewBox="0 0 16 16"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8h9M8.5 4l4 4-4 4" />
      </svg>
    </span>
  );
}
