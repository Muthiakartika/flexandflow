/**
 * JSON-LD for the studio site — what Google reads to understand that this is a
 * local business in Uluwatu, which treatments it sells, and which pages are
 * articles. Rendered by `components/layout/JsonLd.tsx`.
 *
 * **Only facts the site already publishes.** No `aggregateRating`, no review,
 * no `geo`, and a `priceRange` derived from the published rate card: a rating
 * the studio cannot back up is a manual action waiting to happen, and this repo
 * has published a wrong price three times already (CLAUDE.md). Offers come
 * from the same `priceAmount` the visible price rows use, so the two cannot
 * disagree. The Google Maps listing (`hasMap`, `sameAs`) is the one the
 * reviews band already links to.
 *
 * Beside the business on every page: `WebSite` on the home page (the name
 * Google shows above each result), a `BreadcrumbList` wherever the visible
 * trail is (`Breadcrumbs`), `Service` on the treatment pages and the home
 * service page, `BlogPosting` on the guides, `ProfilePage` and `Person` on
 * the therapist profiles, and a `FAQPage` wherever the page has questions.
 */

import { therapistRates } from "@/lib/data/priceList";
import type { Therapist } from "@/lib/data/therapists";
import { priceAmount } from "@/lib/pricing";
import { GOOGLE_REVIEWS } from "@/lib/seo/reviews";
import { contact, homeServiceAreas, siteConfig } from "@/lib/site";
import type { ContentBlock, Post, Service } from "@/types";

/** The business node's `@id`. Services and articles point back at it. */
export const BUSINESS_ID = `${siteConfig.url}/#business`;

/** The site node's `@id` (`websiteSchema`). */
export const WEBSITE_ID = `${siteConfig.url}/#website`;

/** The studio and a session in it: what the business looks like. The logo
 *  is `logo`; as the only image it said nothing about the place. */
const BUSINESS_IMAGES = [
  "/images/2026/08/about-studio.jpg",
  "/images/2026/08/gallery-6.jpg",
  "/images/2026/08/private-therapy.jpg",
];

/** A path as its canonical URL: absolute, with the trailing slash. */
const canonicalUrl = (href: string) =>
  absolute(href === "/" || href.endsWith("/") || /\.[a-z0-9]+$/i.test(href) ? href : `${href}/`);

const absolute = (path: string) =>
  path.startsWith("http") ? path : `${siteConfig.url}${path}`;

/** The Instagram URL without its share-tracking query string. */
const instagram = contact.instagram.split("?")[0];

/** Cheapest to dearest session on `/price-list`, from the rows that page renders. */
function priceRange() {
  const amounts = therapistRates.flatMap((card) =>
    card.rows.map((row) => row.amount),
  );
  const idr = (n: number) => n.toLocaleString("en-US");
  return `IDR ${idr(Math.min(...amounts))} – ${idr(Math.max(...amounts))}`;
}

export function businessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_ID,
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: `${siteConfig.url}/`,
    logo: absolute(siteConfig.logo),
    image: BUSINESS_IMAGES.map(absolute),
    description: siteConfig.description,
    telephone: contact.phone,
    email: contact.email,
    priceRange: priceRange(),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Toya Ning II",
      addressLocality: "Ungasan, Kuta Selatan",
      addressRegion: "Bali",
      postalCode: "80361",
      addressCountry: "ID",
    },
    areaServed: ["Uluwatu", "Ungasan", "Bali"],
    /* `workingHours` is one row today ("Monday to Saturday", "09:00 - 17:00
       hrs"); spelled out here because schema.org wants day names and 24h
       times, not the display string. Change both together. */
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "09:00",
      closes: "17:00",
    },
    hasMap: GOOGLE_REVIEWS.url,
    sameAs: [instagram, GOOGLE_REVIEWS.url],
  };
}

/**
 * The site itself, on the home page only, as Google asks. Its `name` is what
 * Google prints above every result from the site, which matters since the
 * guides' titles stopped repeating "| Flex & Flow" (`lib/seo/pages.ts`).
 */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: siteConfig.shortName,
    alternateName: siteConfig.name,
    url: `${siteConfig.url}/`,
    inLanguage: "en",
    publisher: { "@id": BUSINESS_ID },
  };
}

/**
 * The visible "Home / …" trail as a `BreadcrumbList`, rendered by
 * `Breadcrumbs` beside it so the two cannot differ. The current page, last,
 * carries no `item`, as Google allows.
 */
export function breadcrumbSchema(crumbs: { label: string; href?: string }[]) {
  const trail = [{ label: "Home", href: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      ...(crumb.href && i < trail.length - 1 ? { item: canonicalUrl(crumb.href) } : {}),
    })),
  };
}

export function serviceSchema(service: Service) {
  const offers = service.tiers.flatMap((tier) => {
    const amount = priceAmount(tier);
    return amount === null
      ? []
      : [
          {
            "@type": "Offer",
            name: `${service.title} — ${tier.label}`,
            price: amount,
            priceCurrency: "IDR",
            url: absolute(service.seo.canonicalPath),
          },
        ];
  });

  const url = absolute(service.seo.canonicalPath);
  const node = {
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.title,
    description: service.seo.description,
    url,
    image: service.image ? absolute(service.image) : undefined,
    provider: { "@id": BUSINESS_ID },
    areaServed: { "@type": "Place", name: "Uluwatu, Bali" },
    offers: offers.length ? offers : undefined,
  };
  const faq = faqSchema(url, service.body);

  return {
    "@context": "https://schema.org",
    "@graph": faq ? [node, faq] : [node],
  };
}

/**
 * `post.date` is the display string WordPress showed ("June 22, 2026").
 * Parsed and re-read with local getters on the same machine, so the day never
 * shifts across the UTC/UTC+8 boundary; an unparseable date is left out
 * rather than guessed.
 */
function isoDay(display: string): string | undefined {
  const date = new Date(display);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Who the posts are credited to. The studio's articles are written in its
 * founder's voice, and answer engines weigh a named practitioner over a
 * business name. `about` repeats only what her own profile page publishes.
 */
export const POST_AUTHOR = {
  name: "Ginny",
  jobTitle: "Founder and Bodywork Specialist",
  profile: "/therapist/ginny/",
  portrait: "/images/2026/08/ginny-portrait.jpg",
  about:
    "Ginny is the founder of Flex & Flow in Ungasan, Uluwatu, and our master therapist, with a background in nursing, professional fitness training and bodywork. She specialises in sport massage, assisted stretching, lymphatic drainage and healing bodywork.",
};

/** Inline markers (`[text](url)`, `**bold**`, `*italic*`) reduced to their text. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

/**
 * A `FAQPage` for every `faq` block on the page, or null when it has none.
 *
 * Built from the page's own blocks rather than written separately, so the
 * structured answers are always the visible ones word for word — Google
 * ignores FAQ markup that does not match the page, and a second copy kept by
 * hand would drift the first time somebody edited an answer. The body already
 * includes the sections `lib/seo/sections` adds, so their questions count too.
 */
function faqSchema(url: string, body: ContentBlock[]) {
  const questions = body.flatMap((block) =>
    block.type === "faq" ? block.items : [],
  );
  if (!questions.length) return null;

  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: plain(item.question),
      acceptedAnswer: { "@type": "Answer", text: plain(item.answer) },
    })),
  };
}

/**
 * The home service page: a post in the panel, but a service to the visitor
 * (`HomeServiceArticle`), so a `Service` with the areas a therapist visits,
 * plus its questions. It was a `BlogPosting`.
 */
export function homeServiceSchema(post: Post) {
  const url = absolute(post.seo.canonicalPath);
  const node = {
    "@type": "Service",
    "@id": `${url}#service`,
    name: "Home & Villa Massage",
    serviceType: "Mobile massage",
    description: post.seo.description,
    url,
    image: post.image ? absolute(post.image) : undefined,
    provider: { "@id": BUSINESS_ID },
    areaServed: homeServiceAreas.map((name) => ({ "@type": "Place", name: `${name}, Bali` })),
  };
  const faq = faqSchema(url, post.body);

  return {
    "@context": "https://schema.org",
    "@graph": faq ? [node, faq] : [node],
  };
}

/**
 * A therapist's profile: a `ProfilePage` about a `Person`. Ginny's `@id` is
 * the one every guide's `BlogPosting` names as its author.
 */
export function profileSchema(therapist: Therapist) {
  const url = absolute(`/therapist/${therapist.slug}/`);
  const person = {
    "@type": "Person",
    "@id": `${url}#person`,
    name: therapist.name,
    jobTitle: therapist.role,
    image: absolute(therapist.portrait),
    url,
    worksFor: { "@id": BUSINESS_ID },
    knowsAbout: therapist.specializedIn.split("•").map((skill) => skill.trim()),
    sameAs: therapist.instagram ? [therapist.instagram.split("?")[0]] : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ProfilePage", "@id": `${url}#page`, url, mainEntity: { "@id": person["@id"] } },
      person,
    ],
  };
}

/** A `BlogPosting`, plus a `FAQPage` when the body has questions. */
export function articleSchema(post: Post) {
  const url = absolute(post.seo.canonicalPath);

  const article = {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.seo.description,
    url,
    mainEntityOfPage: url,
    image: post.image ? absolute(post.image) : undefined,
    datePublished: isoDay(post.date),
    dateModified: post.updated,
    inLanguage: "en",
    author: {
      "@type": "Person",
      "@id": `${absolute(POST_AUTHOR.profile)}#person`,
      name: POST_AUTHOR.name,
      jobTitle: POST_AUTHOR.jobTitle,
      url: absolute(POST_AUTHOR.profile),
      worksFor: { "@id": BUSINESS_ID },
    },
    publisher: { "@id": BUSINESS_ID },
  };

  const faq = faqSchema(url, post.body);

  return {
    "@context": "https://schema.org",
    "@graph": faq ? [article, faq] : [article],
  };
}
