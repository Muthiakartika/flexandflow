import { Clock, House, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Stars } from "@/components/content/ReviewsBand";
import OpenStatus from "@/components/layout/OpenStatus";
import { BTN_GHOST, BTN_SOLID, FOCUS, WRAP } from "@/components/ui/tokens";
import { therapists } from "@/lib/data/therapists";
import { formatIdr } from "@/lib/pricing";
import { GOOGLE_REVIEWS } from "@/lib/seo/reviews";
import { assets, bookingCtaHref, bookingCtaProps, contact } from "@/lib/site";

/* The chips are half a phone wide, where "Founder & Bodywork Specialist"
   and "Javanese Massage Therapist" were cut off mid-word; the short form
   wraps to a second line there rather than truncating. */
const SHORT_ROLE: Record<string, string> = {
  ginny: "Founder",
  yuni: "Javanese massage",
};

/**
 * Home hero, in the treatment hero's language (`ServiceHero`): the claim, one
 * solid booking pill and a quiet WhatsApp one, the Google rating, and three
 * facts in a single strip; the studio footage on the right with the two
 * practitioners overlapping its foot.
 *
 * The h1 is unchanged because the page's search title is built around it;
 * the lead is rewritten for clients who already know what they are booking.
 * `data-hero` is what `StickyBookBar` watches: the bar comes up on a phone
 * once this has scrolled away.
 */
export default function Hero({ from }: { from: number | null }) {
  const facts = [
    { icon: Clock, term: "Session", detail: "60 min", meta: "One to one" },
    from !== null
      ? { icon: Tag, term: "From", detail: formatIdr(from), meta: "Per session" }
      : null,
    { icon: House, term: "Villa", detail: "Available", meta: "Across Uluwatu" },
  ].filter((fact) => fact !== null);

  return (
    <section data-hero className={`${WRAP} pt-[clamp(1.25rem,2.4vw,2rem)] pb-[clamp(1.75rem,3vw,2.75rem)]`}>
      <div className="grid items-center gap-[clamp(1.75rem,3.2vw,3.25rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ── Claim ───────────────────────────────────────────────────────── */}
        {/* No entrance animation: nothing above the fold ships at
            `opacity: 0` (DESIGN.md, Motion). */}
        <div>
          <div className="inline-flex rounded-full border border-secondary/12 bg-white px-3.5 py-1.5">
            <OpenStatus />
          </div>

          <h1 className="mt-4 max-w-[16ch] text-[clamp(2.125rem,1.45rem+2.8vw,3.5rem)] leading-[1.02] font-bold text-balance">
            Private Bodywork &amp; Movement Studio in Uluwatu
          </h1>

          <p className="mt-4 max-w-[50ch] font-body text-[clamp(0.9375rem,0.9rem+0.2vw,1.0625rem)] leading-[1.7] text-body-text/80">
            Massage, assisted stretching and recovery work for bodies that
            surf, train and travel hard. One therapist from start to finish,
            at our studio in Ungasan or at your villa.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link href={bookingCtaHref} {...bookingCtaProps} className={`${BTN_SOLID} rounded-full`}>
              Book Session
            </Link>
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN_GHOST} rounded-full`}
            >
              WhatsApp Us
            </a>
          </div>

          {/* Google's own tally (`lib/seo/reviews.ts`); the reviews stay on
              Google, where they belong to the people who wrote them. */}
          <a
            href={GOOGLE_REVIEWS.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] text-body-text/70 transition-colors duration-300 hover:text-primary ${FOCUS}`}
          >
            <Stars />
            <span>
              <strong className="text-body-text">{GOOGLE_REVIEWS.rating.toFixed(1)}</strong> &middot;{" "}
              {GOOGLE_REVIEWS.count} Google reviews
            </span>
          </a>

          {/* One strip at every width, as on the treatment hero: three
              stacked rows on a phone made a 250px box out of three facts. */}
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

        {/* ── Studio footage, with the two practitioners on its foot ─────── */}
        <div className="home-hero-media">
          <video
            className="aspect-[4/3] w-full rounded-[10px] object-cover lg:aspect-square"
            src={assets.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />

          <ul className="home-hero-team">
            {therapists.map((therapist) => (
              <li key={therapist.slug}>
                <Link
                  href={`/therapist/${therapist.slug}`}
                  className={`group flex h-full items-center gap-2.5 rounded-[10px] border border-secondary/10 bg-white/95 px-2.5 py-2 backdrop-blur-sm transition-colors duration-300 hover:border-primary/45 ${FOCUS}`}
                >
                  <Image
                    src={therapist.portrait}
                    alt=""
                    aria-hidden
                    width={200}
                    height={200}
                    sizes="40px"
                    className="h-9 w-9 shrink-0 rounded-full object-cover object-top sm:h-10 sm:w-10"
                  />
                  <span className="min-w-0">
                    <span className="block font-display text-[21px] leading-none font-bold transition-colors duration-300 group-hover:text-primary">
                      {therapist.name}
                    </span>
                    <span className="mt-1 block font-body text-[11.5px] leading-[1.2] text-body-text/60">
                      {SHORT_ROLE[therapist.slug] ?? therapist.teamRole}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
