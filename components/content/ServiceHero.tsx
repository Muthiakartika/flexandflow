import { Clock, House, MapPin, Tag, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/PageHero";
import { BAND_LINE, BTN_GHOST, BTN_SOLID, WRAP } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/pricing";
import { pageSeoFor } from "@/lib/seo/pages";
import { bookingCtaHref, bookingCtaProps, contact } from "@/lib/site";
import type { Service } from "@/types";
import RateCard from "./RateCard";
import { Stars } from "./ReviewsBand";
import { GOOGLE_REVIEWS } from "@/lib/seo/reviews";

/** One priced tier, as the hero card and the side card both show it. */
export type Rate = {
  label: string;
  note: string;
  amount: number;
  /** Set only when the tiers differ in length; otherwise the card states it once. */
  minutes: number | null;
  /** The same session at the client's villa, fee included. Null when the
   *  treatment is studio only. */
  villa: number | null;
};

/** The tiers, studio price first and the villa price under it. */
export function RateList({ rates }: { rates: Rate[] }) {
  return (
    <dl>
      {rates.map((rate) => (
        <div
          key={rate.label}
          className="flex items-baseline justify-between gap-4 border-t border-secondary/10 py-2.5"
        >
          <dt>
            <span className="page-label block">{rate.label}</span>
            <span className="mt-1 block font-body text-[12px] leading-none text-body-text/55">
              {rate.minutes ? `${rate.minutes} min · ` : ""}
              {rate.note}
            </span>
          </dt>
          <dd className="text-right">
            <span className="block font-body text-[15px] leading-none font-bold tabular-nums">
              {formatIdr(rate.amount)}
            </span>
            {rate.villa !== null ? (
              <span className="mt-1 block font-body text-[12px] leading-none whitespace-nowrap text-body-text/55 tabular-nums">
                At your villa {formatIdr(rate.villa)}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The top of every treatment page, in the home hero's language: the claim on
 * the left with the two ways to book and three facts, the treatment's own
 * photo on the right with the rates anchored to it.
 *
 * The rates used to start below the fold, in an aside beside the article, so
 * a visitor had to scroll to learn the one thing they came for. They now sit
 * on the photo itself (overlap is this system's depth; nothing casts a
 * shadow), with the villa price beside each studio price. On a phone the card
 * hangs off the bottom of the photo instead of covering it.
 *
 * Every figure is derived: the tiers from the page's rate card, the villa
 * price from `homeServiceFeeIdr`, the hours from `shortHours`.
 *
 * The home service page uses it too, with its own facts and its own card
 * (the villa price of each treatment) in place of the rate card.
 */
export type HeroFact = { icon: LucideIcon; term: string; detail: string; meta: string };

export default function ServiceHero({
  service,
  rates,
  minutes,
  homeService,
  facts: factsOverride,
  card,
}: {
  service: Pick<Service, "title" | "excerpt" | "image" | "seo">;
  rates: Rate[];
  /** The length every tier shares, or null when they differ. */
  minutes: number | null;
  homeService: boolean;
  /** In place of the facts worked out from the rates. */
  facts?: HeroFact[];
  /** In place of the rate card on the photo. */
  card?: React.ReactNode;
}) {
  const from = rates.length ? Math.min(...rates.map((rate) => rate.amount)) : null;

  const facts = factsOverride ?? [
    minutes ? { icon: Clock, term: "Session", detail: `${minutes} min`, meta: "One to one" } : null,
    from !== null ? { icon: Tag, term: "From", detail: formatIdr(from), meta: "Per session" } : null,
    homeService
      ? { icon: House, term: "Villa", detail: "Available", meta: "Across Uluwatu" }
      : { icon: MapPin, term: "Studio", detail: "Ungasan", meta: "Studio only" },
  ].filter((fact) => fact !== null);

  return (
    <section className={BAND_LINE} data-hero>
      <div className={`${WRAP} pt-[clamp(1.25rem,2.4vw,2rem)] pb-[clamp(1.75rem,3vw,2.75rem)]`}>
        <Breadcrumbs crumbs={[{ label: "Services", href: "/services" }, { label: service.title }]} />

        <div className="mt-5 grid items-center gap-[clamp(1.75rem,3.2vw,3.25rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* ── Claim ─────────────────────────────────────────────────── */}
          {/* No entrance animation, as on the home hero: nothing above the
              fold ships at `opacity: 0`. */}
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-secondary/12 bg-white px-3 py-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="page-label">Uluwatu &middot; Bali</span>
            </p>

            <h1 className="mt-4 max-w-[16ch] text-[clamp(2.125rem,1.45rem+2.8vw,3.5rem)] leading-[1.02] font-bold text-balance">
              {pageSeoFor(service.seo.canonicalPath)?.h1 ?? service.title}
            </h1>

            <p className="mt-4 max-w-[52ch] font-body text-[clamp(0.9375rem,0.9rem+0.2vw,1.0625rem)] leading-[1.7] text-body-text/80">
              {service.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={bookingCtaHref} {...bookingCtaProps} className={BTN_SOLID}>
                Book Session
              </Link>
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={BTN_GHOST}
              >
                Book on WhatsApp
              </a>
            </div>

            {/* The studio's Google rating, where the decision to book is made.
                Google's own tally, from `lib/seo/reviews.ts`. */}
            <a
              href={GOOGLE_REVIEWS.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 font-body text-[13px] text-body-text/70 transition-colors duration-300 hover:text-primary"
            >
              <Stars />
              <span>
                <strong className="text-body-text">{GOOGLE_REVIEWS.rating.toFixed(1)}</strong> &middot;{" "}
                {GOOGLE_REVIEWS.count} Google reviews
              </span>
            </a>

            {/* One strip at every width: three stacked rows on a phone made
                a 250px box out of three facts. Each gets an olive marker so
                a glance finds the one it wants. */}
            <dl
              className="mt-7 grid gap-px overflow-hidden rounded-[10px] border border-secondary/10 bg-secondary/10"
              style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}
            >
              {facts.map((fact) => (
                <div key={fact.term} className="bg-white px-3 py-3 sm:px-4 sm:py-3.5">
                  <dt className="flex items-center gap-1.5 font-body text-[10px] leading-none tracking-[0.14em] text-body-text/55 uppercase sm:text-[11px] sm:tracking-[0.18em]">
                    <fact.icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} />
                    {fact.term}
                  </dt>
                  <dd className="mt-2 font-body text-[14px] leading-none font-bold whitespace-nowrap tabular-nums sm:text-[16px]">
                    {fact.detail}
                  </dd>
                  <dd className="mt-1.5 font-body text-[11px] leading-none text-body-text/55 sm:text-[12px]">
                    {fact.meta}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── The treatment, with its rates anchored to it ─────────────── */}
          <div className="relative">
            <Image
              src={service.image}
              alt=""
              aria-hidden
              width={1300}
              height={975}
              priority
              sizes="(max-width: 1023px) 92vw, 46vw"
              className="aspect-[4/3] w-full rounded-[10px] object-cover"
            />

            {card || rates.length > 0 ? (
              <div className="relative mx-3 -mt-10 rounded-[10px] border border-secondary/10 bg-white/95 p-4 backdrop-blur-sm sm:mx-4 lg:absolute lg:bottom-4 lg:left-4 lg:mx-0 lg:mt-0 lg:w-[20rem]">
                {card ?? <RateCard rates={rates} minutes={minutes} />}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
