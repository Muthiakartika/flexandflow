import { posts } from "@/lib/data/posts";
import { serviceBySlug } from "@/lib/data/services";
import type { Post, Seo } from "@/types";

/**
 * `/uluwatu-bali/<slug>` serves both `dt_service` entries and blog posts on the
 * original site, so lookups there have to check both collections.
 */
export function resolveUluwatuSlug(slug: string) {
  const service = serviceBySlug.get(slug);
  if (service) return { kind: "service" as const, service };

  const post = posts.find((p) => p.category === "uluwatu-bali" && p.slug === slug);
  if (post) return { kind: "post" as const, post };

  return null;
}

export function postsInCategory(category: Post["category"]) {
  return posts.filter((post) => post.category === category);
}

/** Neighbouring posts for the prev/next links, ordered as on the listing. */
export function postNeighbours(post: Post) {
  const index = posts.findIndex((p) => p.slug === post.slug);
  return {
    previous: index > 0 ? posts[index - 1] : undefined,
    next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

/** Build Next.js metadata from a ported Yoast SEO record. */
export function metadataFromSeo(seo: Seo, type: "article" | "website" = "article") {
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: seo.canonicalPath,
      type,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
  };
}
