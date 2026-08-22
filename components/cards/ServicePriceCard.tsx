import Image from "next/image";
import Link from "next/link";

import { CARD, FOCUS, LINK } from "@/components/ui/tokens";
import { formatIdr, priceAmount, serviceMinutes, tierMinutes } from "@/lib/pricing";
import { bookingUrl } from "@/lib/site";
import type { Service } from "@/types";

/**
 * The priced service card on /services/.
 *
 * The theme's version hid the photo at `opacity: 0` behind the content and
 * faded it in under a white veil on hover, which meant the picture of the
 * treatment was invisible until you touched the card. Here the photo leads, and
 * the two rates sit in the open where they can be compared across the grid.
 *
 * Durations are per tier: they usually match, in which case the length is
 * stated once as a chip on the photo. "Book Session" goes to the WordPress
 * booking page, which is not cloned.
 */
export default function ServicePriceCard({ service }: { service: Service }) {
  const href = `/uluwatu-bali/${service.slug}`;
  const uniform = serviceMinutes(service);

  const tiers = service.tiers.flatMap((tier) => {
    const amount = priceAmount(tier);
    return amount === null
      ? []
      : [
          {
            label: tier.label,
            note: tier.note,
            amount,
            minutes: uniform ? null : tierMinutes(service, tier),
          },
        ];
  });

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden ${CARD} transition-colors duration-300 hover:border-primary/45`}
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="relative block overflow-hidden"
      >
        <Image
          src={service.image}
          alt=""
          width={600}
          height={420}
          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 30vw"
          className="aspect-[16/10] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
        />
        {uniform ? (
          <span className="absolute top-3 left-3 rounded-full bg-white/92 px-3 py-1 font-body text-[12px] leading-none tabular-nums backdrop-blur-sm">
            {uniform} min
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[26px] leading-[1.12] font-bold">
          <Link
            href={href}
            className={`transition-colors duration-300 hover:text-primary ${FOCUS}`}
          >
            {service.title}
          </Link>
        </h3>

        <p className="mt-2 font-body text-[13px] leading-[1.6] text-body-text/65">
          {service.excerpt}
        </p>

        <dl className="mt-5">
          {tiers.map((tier) => (
            <div
              key={tier.label}
              className="flex items-baseline justify-between gap-4 border-t border-secondary/10 py-2.5"
            >
              <dt>
                <span className="page-label block">{tier.label}</span>
                <span className="mt-1 block font-body text-[12px] leading-none text-body-text/55">
                  {tier.minutes ? `${tier.minutes} min · ` : ""}
                  {tier.note.replace(/[()]/g, "")}
                </span>
              </dt>
              <dd className="font-body text-[15px] leading-none font-bold tabular-nums">
                {formatIdr(tier.amount)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5">
          <Link
            href={bookingUrl}
            className={`inline-flex items-center justify-center rounded-[10px] bg-primary-strong px-5 py-2.5 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
          >
            Book Session
          </Link>
          <Link href={href} className={LINK}>
            What it involves
          </Link>
        </div>
      </div>
    </article>
  );
}
