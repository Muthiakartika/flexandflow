import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { BAND, CARD, FOCUS, LINK, WRAP } from "@/components/ui/tokens";
import { listPosts, listServices } from "@/lib/cms/read";
import { isIndexable } from "@/lib/content";
import {
  formatIdr,
  priceAmount,
  serviceMinutes,
  teamFirstRates,
} from "@/lib/pricing";
import {
  bookingCtaHref,
  bookingCtaProps,
  contact,
  homeServiceFeeIdr,
  homeServiceSlugs,
} from "@/lib/site";
import { COLUMN_GROUPS, RAIL_PHOTOS } from "@/lib/seo/layouts";
import RailPhotos from "./RailPhotos";
import RailTeam from "./RailTeam";
import RelatedBand from "./RelatedBand";
import PageToc from "./PageToc";
import RichText, { headingId } from "./RichText";
import ServiceHero, { RateList, type Rate } from "./ServiceHero";
import StickyBookBar from "./StickyBookBar";
import ReviewsBand from "./ReviewsBand";
import TierChooser from "./TierChooser";
import { REVIEW_TOPICS } from "@/lib/seo/reviews";
import { WhatsAppMessage } from "@/components/layout/WhatsAppLinks";
import { treatmentMessage } from "@/lib/whatsapp";

/**
 * Treatment pages on the redesign beyond the hero: the article laid out to be
 * skimmed (benefit cards, tiles, prices as a menu) and the booking bar on
 * phones. Sport massage first; once it is signed off, every treatment joins
 * this set and the switch goes.
 */
const REDESIGN_PILOT: ReadonlySet<string> = new Set([
  "sport-massage",
  "assisted-stretching",
  "cupping-therapy",
  "lymphatic-drainage",
  "lymphatic-detox-massage-for-men",
  "pregnancy-massage-service",
  "trauma-healing",
]);
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
export default async function ServiceArticle({
  service,
}: {
  service: Service;
}) {
  const [firstBlock, ...restBlocks] = service.body;
  const hasBanner = Boolean(service.bannerImage);
  const bannerTitle =
    hasBanner && firstBlock?.type === "heading" ? firstBlock.text : null;
  const body = bannerTitle ? restBlocks : service.body;

  const uniform = serviceMinutes(service);
  const homeService = homeServiceSlugs.has(service.slug);
  const pilot = REDESIGN_PILOT.has(service.slug);
  /* The team first and Ginny's tier last (`teamFirstRates`), each with its
     villa price where a therapist brings the treatment home. */
  const rates: Rate[] = teamFirstRates(service).map((rate) => ({
    ...rate,
    villa: homeService ? rate.amount + homeServiceFeeIdr : null,
  }));

  /* Who treats you, under the price heading on the pilot: the team's and
     Ginny's starting prices from the rate card. Only when both are priced. */
  const master = rates.filter((rate) => /master/i.test(rate.label));
  const team = rates.filter((rate) => !/master/i.test(rate.label));
  const priceHeading = body.find(
    (block) => block.type === "heading" && block.level === 2 && /\bprices?\b/i.test(block.text),
  );
  const chooser =
    pilot && priceHeading?.type === "heading" && master.length && team.length
      ? {
          [priceHeading.text]: (
            <TierChooser
              team={Math.min(...team.map((rate) => rate.amount))}
              master={Math.min(...master.map((rate) => rate.amount))}
              minutes={uniform}
              homeService={homeService}
            />
          ),
        }
      : undefined;
  /* The Google rating and this treatment's share of the reviews, just before
     the prices: the moment a visitor weighs the cost. */
  const reviews =
    pilot && priceHeading?.type === "heading"
      ? {
          [priceHeading.text]: (
            <ReviewsBand topics={REVIEW_TOPICS[service.seo.canonicalPath] ?? []} />
          ),
        }
      : undefined;

  /* The five treatments that follow this one, wrapping round the end. A plain
     `slice(0, 5)` of the reading order linked the same five pages from every
     treatment and starved the rest of internal links; rotating gives each
     listed treatment five. Pages switched to `noindex` in the CMS are left
     out — they are kept out of search on purpose, so linking them from every
     treatment would only spend links on pages Google is told to ignore. */
  const all = (await listServices()).filter(
    (other) => other.slug === service.slug || isIndexable(other),
  );
  const at = all.findIndex((other) => other.slug === service.slug);
  const others = [...all.slice(at + 1), ...all.slice(0, Math.max(at, 0))]
    .filter((other) => other.slug !== service.slug)
    .slice(0, 5);

  /* Three articles per treatment, offset by the treatment's position so the
     set differs from page to page and every post is linked from at least two
     treatments. Before this, articles were reachable only from the blog
     listing — three or four internal links each against twenty-eight for a
     treatment. Same rule as above for posts switched to `noindex`. */
  const posts = (await listPosts()).filter(isIndexable);
  const reading = posts.length
    ? Array.from(
        { length: Math.min(3, posts.length) },
        (_, k) => posts[(Math.max(at, 0) * 3 + k) % posts.length],
      )
    : [];

  /* The page's own sections, for the "On this page" list beside the article
     on a wide screen (pilot only). RichText gives these headings the ids. */
  const toc = body.flatMap((block) =>
    block.type === "heading" && block.level === 2
      ? [{ id: headingId(block.text), label: block.text }]
      : [],
  );

  const articleBody = (
    <>
      {service.bannerImage ? (
        <Image
          src={service.bannerImage}
          alt=""
          aria-hidden
          width={1300}
          height={620}
          sizes="(max-width: 1023px) 92vw, 1024px"
          className="mb-7 aspect-[16/8] w-full rounded-[10px] object-cover"
        />
      ) : null}
      {bannerTitle ? <h2 className="heading-hidden">{bannerTitle}</h2> : null}

      <RichText
        blocks={body}
        layout={pilot ? "scannable" : "article"}
        columnGroups={pilot ? COLUMN_GROUPS[service.seo.canonicalPath] : undefined}
        before={reviews}
        after={chooser}
      />

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-secondary/10 pt-7">
        <ButtonLink href={contact.whatsapp} external variant="solid">
          Book on WhatsApp
        </ButtonLink>
        <ButtonLink href={bookingCtaHref}>Book an Appointment</ButtonLink>
      </div>
    </>
  );

  return (
    <>
      <WhatsAppMessage text={treatmentMessage(service.title, homeService)} />
      <ServiceHero
        service={service}
        rates={rates}
        minutes={uniform}
        homeService={homeService}
      />

      {pilot ? (
        /* The redesign: one column at a reading measure, centred, with the
           page's sections listed in the left margin and a tall photo for the
           section being read in the right one, on a wide screen. Neither
           moves the column: the old side card of rates sat in the grid beside
           the article and pushed it over. The header's Book now is the one
           booking button on screen. */
        <section className={`${WRAP} article-band`}>
          <div className="article-layout">
            <PageToc items={toc} />
            <article className="article-main">{articleBody}</article>
            {RAIL_PHOTOS[service.seo.canonicalPath] ? (
              <div className="article-rail">
                <RailPhotos
                  photos={RAIL_PHOTOS[service.seo.canonicalPath]}
                  ids={toc.map((item) => item.id)}
                />
                <RailTeam />
              </div>
            ) : null}
          </div>
        </section>
      ) : (
      <section className={`${WRAP} ${BAND}`}>
        {/* The hero now carries the photo and the rates, so the article opens
            on its copy. The two treatments with a banner image keep it here,
            with its hidden heading, as on the original. */}
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <article className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
            {articleBody}
          </article>

          {/* ── Rates and booking, following the reader ─────────────────── */}
          {/* Desktop only: on a phone the hero's rate card, directly above,
              already puts the price first, so a second copy would only push
              the article down. */}
          <aside className="hidden lg:col-start-2 lg:row-start-1 lg:block lg:sticky lg:top-[92px] lg:h-fit">
            <div className={`${CARD} p-5`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[24px] leading-none font-bold">
                  Rates
                </h2>
                {uniform ? (
                  <span className="page-label tabular-nums">{uniform} min</span>
                ) : null}
              </div>

              <div className="mt-4">
                <RateList rates={rates} />
              </div>

              <Link
                href={bookingCtaHref}

                {...bookingCtaProps}
                className={`mt-4 flex w-full items-center justify-center rounded-[10px] bg-primary-strong px-5 py-3 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
              >
                Book Session
              </Link>

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

          {/* One cell for both link lists. The article spans rows 1–2, so a
              third row would only start below the end of the article. On the
              pilot the same links are photo cards under the section instead
              (`RelatedBand`). */}
            <div className="flex flex-col gap-3 self-start lg:col-start-2 lg:row-start-2 lg:mt-3">
              <nav className={`${CARD} p-5`} aria-label="Other treatments">
                <h2 className="page-label">Other treatments</h2>
                <ul className="mt-3 flex flex-col">
                  {others.map((other) => (
                    <li
                      key={other.slug}
                      className="border-t border-secondary/10"
                    >
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

              {reading.length > 0 && (
                <nav className={`${CARD} p-5`} aria-label="From the blog">
                  <h2 className="page-label">From the blog</h2>
                  <ul className="mt-3 flex flex-col">
                    {reading.map((post) => (
                      <li
                        key={post.slug}
                        className="border-t border-secondary/10"
                      >
                        <Link
                          href={post.seo.canonicalPath}
                          className={`block py-2.5 font-body text-[14px] transition-colors duration-300 hover:text-primary ${FOCUS}`}
                        >
                          {post.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    <Link href="/blog" className={LINK}>
                      All articles
                    </Link>
                  </p>
                </nav>
              )}
            </div>
        </div>
      </section>
      )}

      {pilot ? (
        <RelatedBand
          treatments={others.map((other) => {
            const amounts = other.tiers
              .map(priceAmount)
              .filter((amount): amount is number => amount !== null);
            return {
              href: `/uluwatu-bali/${other.slug}`,
              title: other.title,
              image: other.image,
              from: amounts.length ? Math.min(...amounts) : null,
            };
          })}
          posts={reading.map((post) => ({
            href: post.seo.canonicalPath,
            title: post.title,
            image: post.image,
            label: post.categoryLabel ?? post.category.replace(/-/g, " "),
          }))}
        />
      ) : null}

      {pilot ? (
        <StickyBookBar
          from={
            rates.length
              ? formatIdr(Math.min(...rates.map((rate) => rate.amount)))
              : null
          }
        />
      ) : null}
    </>
  );
}
