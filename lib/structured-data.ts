/**
 * JSON-LD for the studio site — what Google reads to understand that this is a
 * local business in Uluwatu, which treatments it sells, and which pages are
 * articles. Rendered by `components/layout/JsonLd.tsx`.
 *
 * **Only facts the site already publishes.** No `aggregateRating`, no review,
 * no `geo` and no `priceRange` that is not derived from a real tier: a rating
 * the studio cannot back up is a manual action waiting to happen, and this repo
 * has published a wrong price three times already (CLAUDE.md). Offers come
 * from the same `priceAmount` the visible price rows use, so the two cannot
 * disagree.
 */

import { priceAmount } from "@/lib/pricing";
import { contact, siteConfig } from "@/lib/site";
import type { Post, Service } from "@/types";

/** The business node's `@id`. Services and articles point back at it. */
export const BUSINESS_ID = `${siteConfig.url}/#business`;

const absolute = (path: string) =>
  path.startsWith("http") ? path : `${siteConfig.url}${path}`;

/** The Instagram URL without its share-tracking query string. */
const instagram = contact.instagram.split("?")[0];

export function businessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_ID,
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: `${siteConfig.url}/`,
    logo: absolute(siteConfig.logo),
    image: absolute(siteConfig.logo),
    description: siteConfig.description,
    telephone: contact.phone,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Toya Ning II",
      addressLocality: "Ungasan, Kuta Selatan",
      addressRegion: "Bali",
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
    sameAs: [instagram],
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

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.seo.description,
    url: absolute(service.seo.canonicalPath),
    image: service.image ? absolute(service.image) : undefined,
    provider: { "@id": BUSINESS_ID },
    areaServed: { "@type": "Place", name: "Uluwatu, Bali" },
    offers: offers.length ? offers : undefined,
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

export function articleSchema(post: Post) {
  const url = absolute(post.seo.canonicalPath);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo.description,
    url,
    mainEntityOfPage: url,
    image: post.image ? absolute(post.image) : undefined,
    datePublished: isoDay(post.date),
    author: { "@id": BUSINESS_ID },
    publisher: { "@id": BUSINESS_ID },
  };
}
