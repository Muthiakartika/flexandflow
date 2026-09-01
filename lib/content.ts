import { listPosts, listPostsInCategory } from "@/lib/cms/read";
import type { Post, Seo } from "@/types";

/**
 * Resolving a URL to the thing it serves.
 *
 * These used to read the arrays in `lib/data/` synchronously. They now read
 * the CMS tables, so every one of them is `async` — that is the whole shape of
 * the change at the call sites. What they return is unchanged: the same `Post`
 * and `Service` objects the page components already take.
 */

export async function postsInCategory(category: string) {
  return listPostsInCategory(category);
}

/** Neighbouring posts for the prev/next links, ordered as on the listing. */
export async function postNeighbours(post: Post) {
  const posts = await listPosts();
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
