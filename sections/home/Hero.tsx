import Image from "next/image";
import Link from "next/link";

import { therapists } from "@/lib/data/therapists";
import { formatIdr, lowestHourlyRate } from "@/lib/pricing";
import { assets, contact, workingHours } from "@/lib/site";
import { BTN_GHOST, BTN_SOLID, FOCUS, WRAP } from "@/components/ui/tokens";

/**
 * Home hero. The claim and the studio footage share the screen rather than the
 * type sitting on top of video — legibility stops depending on which frame is
 * showing, and the right-hand panel can carry the people who do the work.
 *
 * Everything factual on this screen is read from the real data: the rate comes
 * from `lowestHourlyRate()`, the hours from `workingHours`.
 */
export default function Hero() {
  const from = lowestHourlyRate();

  const facts = [
    { term: "Sessions", detail: "60 minutes", meta: "One to one" },
    from
      ? { term: "From", detail: formatIdr(from), meta: "Per session" }
      : null,
    { term: "Home service", detail: "Available", meta: "Across Uluwatu" },
  ].filter((fact) => fact !== null);

  return (
    <section className={`${WRAP} pt-[clamp(1.5rem,3vw,2.5rem)] pb-[clamp(1.75rem,3vw,2.5rem)]`}>
      <div className="grid items-center gap-[clamp(1.75rem,3.2vw,3.25rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ── Claim ─────────────────────────────────────────────────────── */}
        {/* No entrance animation above the fold, deliberately: the previous
            build shipped ~23 elements at `opacity: 0` and left the first screen
            blank whenever the animation did not run. The page's one authored
            piece of motion is the ticker below, which degrades to a readable
            static strip. */}
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-secondary/12 bg-white px-3 py-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="page-label">Uluwatu &middot; Bali</span>
          </p>

          <h1 className="mt-4 max-w-[16ch] text-[clamp(2.125rem,1.45rem+2.8vw,3.5rem)] leading-[1.02] font-bold text-balance">
            Wellness &amp; Recovery Studio in Uluwatu, Bali
          </h1>

          <p className="mt-4 max-w-[52ch] font-body text-[clamp(0.9375rem,0.9rem+0.2vw,1.0625rem)] leading-[1.7] text-body-text/80">
            Welcome to Flex &amp; Flow, we are a small wellness centre based in
            Uluwatu focused on deep release therapeutic bodywork, recovery, and
            long-term wellness.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_SOLID}
            >
              Book on WhatsApp
            </a>
            <Link href="/services" className={BTN_GHOST}>
              See all treatments
            </Link>
          </div>

          {/* What someone actually needs before they message: how long, how
              much, and whether we come to them. */}
          <dl className="mt-8 grid gap-px overflow-hidden rounded-[10px] border border-secondary/10 bg-secondary/10 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.term} className="bg-white px-4 py-3.5">
                <dt className="page-label">{fact.term}</dt>
                <dd className="mt-1.5 font-body text-[16px] leading-none font-bold tabular-nums">
                  {fact.detail}
                </dd>
                <dd className="mt-1.5 font-body text-[12px] leading-none text-body-text/55">
                  {fact.meta}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Studio footage, with the two practitioners anchored to it ──── */}
        <div className="relative">
          <video
            className="aspect-[4/3] w-full rounded-[10px] object-cover lg:aspect-[5/6]"
            src={assets.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />

          <ul className="absolute inset-x-3 bottom-3 flex flex-col gap-1.5 sm:inset-x-4 sm:bottom-4 lg:right-auto lg:w-[17rem]">
            {therapists.map((therapist) => (
              <li key={therapist.slug}>
                <Link
                  href={`/therapist/${therapist.slug}`}
                  className={`group flex items-center gap-3 rounded-[10px] bg-white/92 px-3 py-2.5 backdrop-blur-sm transition-colors duration-300 hover:bg-white ${FOCUS}`}
                >
                  <Image
                    src={therapist.portrait}
                    alt=""
                    aria-hidden
                    width={200}
                    height={200}
                    sizes="40px"
                    className="h-10 w-10 shrink-0 rounded-full object-cover object-top"
                  />
                  <span className="min-w-0">
                    <span className="block font-display text-[22px] leading-none font-bold transition-colors duration-300 group-hover:text-primary">
                      {therapist.name}
                    </span>
                    <span className="mt-1 block truncate font-body text-[12px] leading-none text-body-text/60">
                      {therapist.teamRole}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Opening hours, stated once near the top so nobody has to scroll for
          them. Hairline-separated rather than boxed — it is a caption, not a
          card. */}
      <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-secondary/10 pt-4">
        {workingHours.map((slot) => (
          <span key={slot.days} className="page-label">
            {slot.days} &middot; {slot.hours}
          </span>
        ))}
        <a
          href={contact.phoneHref}
          className={`page-label transition-colors duration-300 hover:text-primary ${FOCUS}`}
        >
          {contact.phone}
        </a>
      </p>
    </section>
  );
}
