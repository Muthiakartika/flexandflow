import { Clock, House, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import ReviewsBand from "@/components/content/ReviewsBand";
import ServiceHero, { type HeroFact } from "@/components/content/ServiceHero";
import { BAND, BAND_LINE, BTN_SOLID, CARD, FOCUS, H2, LINK, WRAP } from "@/components/ui/tokens";
import { therapistBySlug } from "@/lib/data/therapists";
import { formatIdr } from "@/lib/pricing";
import {
  bookingHref,
  bookingCtaProps,
  contact,
  homeServiceFeeIdr,
  shortHours,
  studioMapsUrl,
} from "@/lib/site";
import Approach from "@/sections/home/Approach";

const title = "About Us: Bodywork Studio in Uluwatu, Bali | Flex & Flow";
const description =
  "Flex & Flow is Ginny's one-to-one bodywork studio in Ungasan, Uluwatu: massage, assisted " +
  "stretching and recovery work, at the studio or at your villa.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about-us/" },
  openGraph: {
    title,
    description,
    url: "/about-us/",
    type: "website",
    images: ["/images/2026/08/about-studio.jpg"],
  },
};

const ginny = therapistBySlug.get("ginny");

/* The team first and Ginny after, as everywhere else (DESIGN.md, copy rule).
   The lines are the profiles' own facts (`lib/data/therapists.ts`) in the
   third person. */
const people = [
  {
    slug: "yuni",
    /* Where the face sits in the square session photo, for the wide crop. */
    position: "30% 12%",
    pill: "Easiest to book",
    line: "Traditional Javanese massage and lymphatic drainage, with a modern understanding of the body.",
  },
  {
    slug: "ginny",
    position: "30% 25%",
    pill: "Limited sessions",
    line: "Assisted stretching, sports and healing massage, and lymphatic drainage. Her diary fills first, so book well ahead.",
  },
];

const space = [
  {
    src: "/images/2026/08/gallery-6.jpg",
    width: 1800,
    height: 900,
    alt: "The movement room at the studio: mats on a wooden floor, mirrors and a lime-green ceiling",
    caption: "The movement room",
  },
  {
    src: "/images/2026/08/gallery-5.jpg",
    width: 1800,
    height: 900,
    alt: "A treatment room with a massage table and rolled towels",
    caption: "A treatment room",
  },
  {
    src: "/images/2026/06/studio-new.jpg",
    width: 1300,
    height: 1200,
    alt: "The Flex & Flow logo painted on the studio wall",
    caption: "Stretch · Release · Recover",
  },
];

/**
 * The About page, in the treatment pages' language: their hero with the
 * studio's facts and Ginny on the photo, then how the studio started (her
 * story, from her profile), how a session runs (the home page's steps), who
 * treats you (the team first), the space itself and the Google reviews.
 *
 * It used to open on "About us" and a fact table, borrow the home page's
 * old benefits band, list Ginny first and end on an olive band that
 * repeated the footer's own sign-off.
 */
export default function AboutPage() {
  const facts: HeroFact[] = [
    { icon: MapPin, term: "Studio", detail: "Ungasan", meta: "Uluwatu, Bali" },
    { icon: Clock, term: "Hours", detail: "09:00–17:00", meta: "Mon–Sat" },
    { icon: House, term: "Villa", detail: "Available", meta: "Across Uluwatu" },
  ];

  return (
    <>
      <ServiceHero
        service={{
          title: "About Flex & Flow",
          excerpt:
            "A small, one-to-one bodywork studio in Ungasan, Uluwatu: massage, assisted stretching and recovery work for bodies that surf, train and travel hard. At the studio, or at your villa.",
          image: "/images/2026/08/about-studio.jpg",
          seo: { title, description, canonicalPath: "/about-us/" },
        }}
        rates={[]}
        minutes={null}
        homeService
        facts={facts}
        crumbs={[{ label: "About us" }]}
        card={
          ginny ? (
            <>
              <div className="flex items-center gap-3">
                <Image
                  src={ginny.portrait}
                  alt=""
                  width={160}
                  height={160}
                  sizes="48px"
                  className="h-12 w-12 shrink-0 rounded-full object-cover object-top"
                />
                <div>
                  <p className="page-label">Founded by</p>
                  <p className="mt-1 font-display text-[26px] leading-none font-bold">Ginny</p>
                </div>
              </div>
              <p className="mt-3 font-body text-[13px] leading-[1.5] text-body-text/70">
                A background in nursing, professional fitness training and bodywork.
              </p>
              <Link href="/therapist/ginny" className={`mt-2 inline-block text-[13px]! ${LINK}`}>
                Meet Ginny &rarr;
              </Link>
            </>
          ) : undefined
        }
      />

      {/* ── How it started ─────────────────────────────────────────────── */}
      <section className={BAND_LINE} aria-labelledby="about-story">
        <div className={`${WRAP} ${BAND}`}>
          <div className="grid items-center gap-[clamp(2rem,3.6vw,3.5rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            {ginny ? (
              <Image
                src={ginny.sceneImage}
                alt="Ginny working on a client's neck and shoulders"
                width={1800}
                height={1800}
                sizes="(max-width: 1023px) 92vw, 40vw"
                className="aspect-[5/4] w-full rounded-[10px] object-cover object-[30%_center]"
              />
            ) : null}

            <div className="min-w-0">
              <p className="page-label">How it started</p>
              <h2 id="about-story" className={`mt-2 ${H2}`}>
                Built Around Listening
              </h2>
              <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-[1.7] text-body-text/80">
                Ginny&rsquo;s background is in nursing, professional fitness training and bodywork.
                Her way of working came from years with clients carrying stiffness, restricted
                movement, tension and sports-related tightness, and from her own injury, when she
                could not find recovery work that paid enough attention to the details.
              </p>
              <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-[1.7] text-body-text/80">
                Flex &amp; Flow is the studio she wanted then: one to one, unhurried, and built on
                listening before anything else. The team works the same way, at the studio in
                Ungasan or at your villa.
              </p>

              {/* Her own words, from her profile on this site. */}
              <figure className="about-quote">
                <blockquote>
                  I take time to listen, pay close attention to what your body is telling me, and
                  adjust my focus before deciding how to approach each session.
                </blockquote>
                <figcaption>Ginny, founder</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <Approach />

      {/* ── Who treats you ─────────────────────────────────────────────── */}
      <section className={BAND_LINE} aria-labelledby="about-team">
        <div className={`${WRAP} ${BAND}`}>
          <p className="page-label">Who treats you</p>
          <h2 id="about-team" className={`mt-2 ${H2}`}>
            Our Therapists, and Ginny
          </h2>
          <p className="mt-3 max-w-[58ch] font-body text-[15px] leading-[1.7] text-body-text/80">
            Book our therapists for the most open slots. Ginny&rsquo;s own sessions are limited,
            and priced as the step up.
          </p>

          <ul className="mt-7 grid gap-4 md:grid-cols-2">
            {people.map((person) => {
              const therapist = therapistBySlug.get(person.slug);
              if (!therapist) return null;
              const team = person.slug !== "ginny";
              return (
                <li key={person.slug} className={`flex flex-col overflow-hidden ${CARD} ${team ? "border-primary/45!" : ""}`}>
                  <Image
                    src={therapist.sceneImage}
                    alt={`${therapist.name} working with a client`}
                    width={1800}
                    height={1800}
                    sizes="(max-width: 767px) 92vw, 46vw"
                    className="aspect-[16/10] w-full object-cover"
                    style={{ objectPosition: person.position }}
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <p
                      className={`self-start rounded-full px-3 py-1 font-body text-[11px] leading-none tracking-[0.12em] uppercase ${
                        team ? "bg-primary-strong text-white" : "border border-secondary/20 text-body-text/70"
                      }`}
                    >
                      {person.pill}
                    </p>
                    <h3 className="mt-3 font-display text-[32px] leading-none font-bold">{therapist.name}</h3>
                    <p className="mt-1.5 font-body text-[13px] text-body-text/65">{therapist.role}</p>
                    <p className="mt-3 font-body text-[15px] leading-[1.6] text-body-text/80">{person.line}</p>
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {therapist.specializedIn.split("•").map((skill) => (
                        <li
                          key={skill}
                          className="rounded-full border border-secondary/15 px-2.5 py-1 font-body text-[12px] leading-none text-body-text/75"
                        >
                          {skill.trim()}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5">
                      <Link href={bookingHref({ staff: therapist.slug })} {...bookingCtaProps} className={BTN_SOLID}>
                        Book with {therapist.name}
                      </Link>
                      <Link href={`/therapist/${therapist.slug}`} className={LINK}>
                        Full profile &rarr;
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── The space ──────────────────────────────────────────────────── */}
      <section className={BAND_LINE} aria-labelledby="about-space">
        <div className={`${WRAP} ${BAND}`}>
          <p className="page-label">The space</p>
          <h2 id="about-space" className={`mt-2 ${H2}`}>
            The Studio, or Your Villa
          </h2>

          <ul className="about-space">
            {space.map((photo) => (
              <li key={photo.src}>
                <figure>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 767px) 92vw, 30vw"
                  />
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <dl className="pl-facts">
            <div>
              <dt>Studio</dt>
              <dd>
                {contact.address}
                <br />
                <a
                  href={studioMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[14px]! ${LINK} ${FOCUS}`}
                >
                  Open in Google Maps &rarr;
                </a>
              </dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>
                {shortHours}
                <br />
                <span className="text-body-text/60">Closed on Sunday</span>
              </dd>
            </div>
            <div>
              <dt>At your villa</dt>
              <dd>
                Ungasan to Balangan, {formatIdr(homeServiceFeeIdr)} per visit on top of the studio
                price.
                <br />
                <Link href="/uluwatu-bali/outcall-home-service-massage/" className={`text-[14px]! ${LINK}`}>
                  How home visits work &rarr;
                </Link>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── What clients say ───────────────────────────────────────────────
          No buttons after it: the footer's sign-off, directly below, has
          the same two. */}
      <section className={BAND_LINE}>
        <div className={`${WRAP} ${BAND}`}>
          <div className="prose-flex max-w-[760px]">
            <ReviewsBand topics={[]} />
          </div>
        </div>
      </section>
    </>
  );
}
