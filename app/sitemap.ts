import type { MetadataRoute } from "next";

import { listPosts, listServices } from "@/lib/cms/read";
import { isIndexable } from "@/lib/content";
import { therapists } from "@/lib/data/therapists";
import { siteConfig } from "@/lib/site";

/**
 * Every URL here is meant to rank. Deliberately excluded, because WordPress
 * marks the equivalents `noindex` and this app matches that (see
 * SITE-STRUCTURE.md): the `/uluwatu-bali/` and `/injury-guide/` category
 * archives, and any treatment or post whose "show in search results" switch
 * is off in the CMS. The therapist profiles are in since 8 Nov 2026. Listing
 * a `noindex` page here would tell Google to index the very page its own
 * meta tag says not to.
 *
 * Services and posts are read from the same data the pages themselves use
 * (`seo.canonicalPath`), so a slug published in the CMS appears here without a
 * second place to remember to update — and unpublishing one removes it, which
 * matters: a sitemap that keeps listing a URL that now 404s is a crawl error
 * the studio would never see.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts] = await Promise.all([listServices(), listPosts()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/` },
    { url: `${siteConfig.url}/about-us/` },
    { url: `${siteConfig.url}/services/` },
    { url: `${siteConfig.url}/price-list/` },
    { url: `${siteConfig.url}/contact-us/` },
    { url: `${siteConfig.url}/blog/` },
    ...therapists.map((therapist) => ({ url: `${siteConfig.url}/therapist/${therapist.slug}/` })),
  ];

  const servicePages: MetadataRoute.Sitemap = services
    .filter(isIndexable)
    .map((service) => ({
      url: `${siteConfig.url}${service.seo.canonicalPath}`,
    }));

  const postPages: MetadataRoute.Sitemap = posts
    .filter(isIndexable)
    .map((post) => ({
      url: `${siteConfig.url}${post.seo.canonicalPath}`,
      /* The last edit when there is one, which is what Google reads this
         for; the publish date otherwise. */
      lastModified: new Date(post.updated ?? post.date),
    }));

  return [...staticPages, ...servicePages, ...postPages];
}
