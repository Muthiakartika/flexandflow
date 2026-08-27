import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { BAND, CARD, FOCUS, LINK, WRAP } from "@/components/ui/tokens";
import { services } from "@/lib/data/services";
import { formatIdr, priceAmount, serviceMinutes, tierMinutes } from "@/lib/pricing";
import { externalBookingUrl, contact } from "@/lib/site";
import RichText from "./RichText";
import type { Service } from "@/types";

/**
 * Service detail page.
 *
 * The clone ran the body copy down a 70%-wide column with a 100px gutter and no
 * price anywhere on the page — someone reading about a treatment had to leave
 * for the price list to find out what it cost. The rates, the length and the
 * two ways to book now sit in an aside that follows the reader down the page,
 * with the other treatments under it.
 *
 * Two of the eight services carry a banner image whose heading the theme sets
 * to `visibility: hidden`; it stays in the DOM through `.heading-hidden` for
 * heading order, as on the original.
 */
export default function ServiceArticle({ service }: { service: Service }) {
  const [firstBlock, ...restBlocks] = service.body;
  const hasBanner = Boolean(service.bannerImage);
  const bannerTitle =
    hasBanner && firstBlock?.type === "heading" ? firstBlock.text : null;
  const body = bannerTitle ? restBlocks : service.body;

  const uniform = serviceMinutes(service);
  const rates = service.tiers.flatMap((tier) => {
    const amount = priceAmount(tier);
    return amount === null
      ? []
      : [
          {
            label: tier.label,
            note: tier.note.replace(/[()]/g, ""),
            amount,
            minutes: uniform ? null : tierMinutes(service, tier),
          },
        ];
  });

  const others = services
    .filter((other) => other.slug !== service.slug)
    .slice(0, 5);

  return (
    <>
      <PageHero
        title={service.title}
        crumbs={[
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
        lead={service.excerpt}
        actions={
          <ButtonLink href={contact.whatsapp} external variant="solid">
            Book on WhatsApp
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        {/* On a phone the rates come first: stacked in source order they landed
            below a 4,500px article, so the one number the reader came for was
            the last thing on the page. The "other treatments" list stays after
            the article, where it belongs. */}
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <article className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Image
              src={service.bannerImage ?? service.image}
              alt=""
              aria-hidden
              width={1300}
              height={620}
              priority
              sizes="(max-width: 1023px) 92vw, 1024px"
              className="aspect-[16/8] w-full rounded-[10px] object-cover"
            />
            {bannerTitle ? <h2 className="heading-hidden">{bannerTitle}</h2> : null}

            <RichText blocks={body} className="mt-7" />

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-secondary/10 pt-7">
              <ButtonLink href={contact.whatsapp} external variant="solid">
                Book on WhatsApp
              </ButtonLink>
              <ButtonLink href={externalBookingUrl} external>
                Book an Appointment
              </ButtonLink>
            </div>
          </article>

          {/* ── Rates and booking, following the reader ─────────────────── */}
          <aside className="order-first lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[92px] lg:h-fit">
            <div className={`${CARD} p-5`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[24px] leading-none font-bold">
                  Rates
                </h2>
                {uniform ? (
                  <span className="page-label tabular-nums">{uniform} min</span>
                ) : null}
              </div>

              <dl className="mt-4">
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
                    <dd className="font-body text-[15px] leading-none font-bold tabular-nums">
                      {formatIdr(rate.amount)}
                    </dd>
                  </div>
                ))}
              </dl>

              <a
                href={externalBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 flex w-full items-center justify-center rounded-[10px] bg-primary-strong px-5 py-3 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
              >
                Book Session
              </a>

              <p className="mt-3 text-center">
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-body text-[14px] tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
                >
                  {contact.phone}
                </a>
              </p>
            </div>
          </aside>

          <nav
            className={`${CARD} self-start p-5 lg:col-start-2 lg:row-start-2 lg:mt-3`}
            aria-label="Other treatments"
          >
            <h2 className="page-label">Other treatments</h2>
            <ul className="mt-3 flex flex-col">
              {others.map((other) => (
                <li key={other.slug} className="border-t border-secondary/10">
                  <Link
                    href={`/uluwatu-bali/${other.slug}`}
                    className={`block py-2.5 font-body text-[14px] transition-colors duration-300 hover:text-primary ${FOCUS}`}
                  >
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <Link href="/services" className={LINK}>
                All treatments &amp; rates
              </Link>
            </p>
          </nav>
        </div>
      </section>
    </>
  );
}
