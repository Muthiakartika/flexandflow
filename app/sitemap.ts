import type { MetadataRoute } from "next";

import { posts } from "@/lib/data/posts";
import { services } from "@/lib/data/services";
import { siteConfig } from "@/lib/site";

/**
 * Every URL here is meant to rank. Deliberately excluded, because WordPress
 * marks the equivalents `noindex` and this app matches that (see
 * SITE-STRUCTURE.md): the `/uluwatu-bali/` and `/injury-guide/` category
 * archives, the two therapist profiles, and the `/preview/*` routes. Listing
 * a `noindex` page here would tell Google to index the very page its own
 * meta tag says not to.
 *
 * Services and posts are read from the same data the pages themselves use
 * (`seo.canonicalPath`), so a slug added there appears here without a
 * second place to remember to update.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/` },
    { url: `${siteConfig.url}/about-us/` },
    { url: `${siteConfig.url}/services/` },
    { url: `${siteConfig.url}/price-list/` },
    { url: `${siteConfig.url}/contact-us/` },
    { url: `${siteConfig.url}/blog/` },
  ];

  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${siteConfig.url}${service.seo.canonicalPath}`,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}${post.seo.canonicalPath}`,
    lastModified: new Date(post.date),
  }));

  return [...staticPages, ...servicePages, ...postPages];
}
