import Link from "next/link";

import TierChooser from "@/components/content/TierChooser";
import { BAND_LINE, H2, LINK, WRAP } from "@/components/ui/tokens";
import { priceAmount, tierMinutes } from "@/lib/pricing";
import type { Service } from "@/types";

/**
 * The lowest hour with the team and with Ginny. The same restriction as
 * `lowestHourlyRate`: 60-minute sessions at treatments that offer both, so
 * a 30-minute cupping session or a Master-only treatment cannot set either
 * figure (DESIGN.md, prices).
 */
function hourFrom(services: Service[]) {
  const team: number[] = [];
  const master: number[] = [];
  for (const service of services) {
    if (service.tiers.length < 2) continue;
    for (const tier of service.tiers) {
      const amount = priceAmount(tier);
      if (amount === null || tierMinutes(service, tier) !== 60) continue;
      (/master/i.test(tier.label) ? master : team).push(amount);
    }
  }
  return team.length && master.length
    ? { team: Math.min(...team), master: Math.min(...master) }
    : null;
}

/**
 * Who treats you, as the treatment pages put it: the team first and the
 * easiest to book, Ginny's own sessions the limited step up
 * (`TierChooser`; its styles live under `.prose-flex`, hence the wrapper).
 * Replaces the two practitioner cards, which each carried a booking button.
 */
export default function WhoTreatsYou({ services }: { services: Service[] }) {
  const from = hourFrom(services);
  if (!from) return null;

  return (
    <section className={BAND_LINE} aria-labelledby="home-who">
      <div className={`${WRAP} home-band home-split`}>
        <div>
          <p className="page-label">Who treats you</p>
          <h2 id="home-who" className={`mt-2 ${H2}`}>
            The Team, or Ginny
          </h2>
          <p className="mt-3 max-w-[46ch] font-body text-[15px] leading-[1.7] text-body-text/80">
            Ginny founded the studio and the way it works. The team brings that
            approach to every session and has the most open slots. Ginny’s own
            sessions are limited, so book those well ahead.
          </p>
          <p className="mt-5">
            <Link href="/about-us" className={LINK}>
              Meet the team &rarr;
            </Link>
          </p>
        </div>

        <div className="prose-flex home-tiers">
          <TierChooser team={from.team} master={from.master} minutes={60} homeService />
        </div>
      </div>
    </section>
  );
}
