import { Clock, House, MapPin } from "lucide-react";

import PageToc from "./PageToc";
import RailPhotos from "./RailPhotos";
import RailTeam from "./RailTeam";
import RelatedBand from "./RelatedBand";
import ReviewsBand from "./ReviewsBand";
import RichText, { headingId } from "./RichText";
import ServiceHero, { type HeroFact } from "./ServiceHero";
import StickyBookBar from "./StickyBookBar";
import { WhatsAppMessage } from "@/components/layout/WhatsAppLinks";
import { ButtonLink } from "@/components/ui/Button";
import { WRAP } from "@/components/ui/tokens";
import { listPosts, listServices } from "@/lib/cms/read";
import { isIndexable } from "@/lib/content";
import { formatIdr, priceAmount, serviceMinutes } from "@/lib/pricing";
import { COLUMN_GROUPS, RAIL_PHOTOS } from "@/lib/seo/layouts";
import { bookingCtaHref, contact, homeServiceFeeIdr, homeServiceSlugs } from "@/lib/site";
import { TREATMENT_NAMES } from "@/lib/treatments";
import { homeServiceMessage } from "@/lib/whatsapp";
import type { Post, Service } from "@/types";

/** The home service page: an article in the panel, a service on the site. */
export const HOME_SERVICE_PATH = "/uluwatu-bali/outcall-home-service-massage/";

const PHOTO = "/images/2026/08/home-service.jpg";

/* The reviews card goes where the treatment pages put it, just before the
   prices: here, the worked costs in the page's own sections. */
const COSTS_HEADING = "What a home visit costs: worked examples";

/** A treatment's lowest price with the team, or its only tier's when it has
 *  just the one (cupping is the same price with either practitioner). */
function lowestPrice(service: Service): number | null {
  const priced = service.tiers.flatMap((tier) => {
    const amount = priceAmount(tier);
    return amount === null ? [] : [{ amount, master: /master/i.test(tier.label) }];
  });
  const team = priced.filter((p) => !p.master);
  const pool = team.length ? team : priced;
  return pool.length ? Math.min(...pool.map((p) => p.amount)) : null;
}

/**
 * The home service page in the treatment pages' layout, though the panel
 * keeps it as an article: the treatment hero with the villa price of every
 * treatment a therapist brings home in place of a rate card, the article in
 * one reading column with "On this page" and the section photos beside it,
 * the other treatments and three articles at the foot, and the phone booking
 * bar. The copy is `lib/seo/copy/outcall-home-service-massage.ts`.
 */
export default async function HomeServiceArticle({ post }: { post: Post }) {
  const [services, posts] = await Promise.all([listServices(), listPosts()]);

  /* In `homeServiceSlugs`' order, the order the copy lists them in. */
  const order = [...homeServiceSlugs];
  const atHome = services
    .filter((s) => homeServiceSlugs.has(s.slug) && isIndexable(s))
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  const villa = atHome.flatMap((service) => {
    const from = lowestPrice(service);
    return from === null
      ? []
      : [
          {
            slug: service.slug,
            title: TREATMENT_NAMES[service.slug] ?? service.title,
            minutes: serviceMinutes(service),
            amount: from + homeServiceFeeIdr,
          },
        ];
  });
  const fromVilla = villa.length ? Math.min(...villa.map((v) => v.amount)) : null;

  const facts: HeroFact[] = [
    { icon: House, term: "Visit fee", detail: formatIdr(homeServiceFeeIdr), meta: "Per visit" },
    { icon: MapPin, term: "Area", detail: "Uluwatu", meta: "Ungasan to Balangan" },
    { icon: Clock, term: "Hours", detail: "09:00–17:00", meta: "Mon–Sat" },
  ];

  const card = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[26px] leading-none font-bold">At your villa</h2>
        <span className="page-label">Fee included</span>
      </div>
      <dl className="mt-2">
        {villa.map((v) => (
          <div
            key={v.slug}
            className="flex items-center justify-between gap-4 border-b border-secondary/10 py-2 last:border-b-0"
          >
            <dt>
              <span className="page-label block">{v.title}</span>
              <span className="mt-1 block font-body text-[12px] leading-none text-body-text/60">
                {v.minutes ? `${v.minutes} min · from` : "From"}
              </span>
            </dt>
            <dd className="font-body text-[16px] leading-none font-bold whitespace-nowrap tabular-nums">
              {formatIdr(v.amount)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 border-t border-secondary/10 pt-3 font-body text-[12px] leading-[1.4] text-body-text/60">
        The studio price plus {formatIdr(homeServiceFeeIdr)} per visit. Trauma healing stays at the
        studio.
      </p>
    </>
  );

  const toc = post.body.flatMap((block) =>
    block.type === "heading" && block.level === 2
      ? [{ id: headingId(block.text), label: block.text }]
      : [],
  );
  const photos = RAIL_PHOTOS[HOME_SERVICE_PATH];
  const reading = posts.filter((p) => p.slug !== post.slug && isIndexable(p)).slice(0, 3);

  return (
    <>
      <WhatsAppMessage text={homeServiceMessage()} />
      <ServiceHero
        service={{ title: "Home Service", excerpt: post.excerpt, image: PHOTO, seo: post.seo }}
        rates={[]}
        minutes={null}
        homeService
        facts={facts}
        card={card}
      />

      <section className={`${WRAP} article-band`}>
        <div className="article-layout">
          <PageToc items={toc} />
          <article className="article-main">
            <RichText
              blocks={post.body}
              layout="scannable"
              columnGroups={COLUMN_GROUPS[HOME_SERVICE_PATH]}
              before={{ [COSTS_HEADING]: <ReviewsBand topics={[]} /> }}
            />
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-secondary/10 pt-7">
              <ButtonLink href={contact.whatsapp} external variant="solid">
                Book on WhatsApp
              </ButtonLink>
              <ButtonLink href={bookingCtaHref}>Book an Appointment</ButtonLink>
            </div>
          </article>
          {photos ? (
            <div className="article-rail">
              <RailPhotos photos={photos} ids={toc.map((item) => item.id)} />
              <RailTeam />
            </div>
          ) : null}
        </div>
      </section>

      <RelatedBand
        treatments={atHome.map((service) => ({
          href: `/uluwatu-bali/${service.slug}`,
          title: service.title,
          image: service.image,
          from: lowestPrice(service),
        }))}
        posts={reading.map((p) => ({
          href: p.seo.canonicalPath,
          title: p.title,
          image: p.image,
          label: p.categoryLabel ?? p.category.replace(/-/g, " "),
        }))}
      />

      <StickyBookBar from={fromVilla !== null ? formatIdr(fromVilla) : null} />
    </>
  );
}
