import { listPosts, listPostsInCategory } from "@/lib/cms/read";
import { homeServicePath } from "@/lib/site";
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
  return (await listPostsInCategory(category)).filter(isGuide);
}

/**
 * Whether a post belongs in the blog's listings. The home service page is a
 * post in the panel but a service to the visitor (`HomeServiceArticle`), and
 * the Services menu is where it is found; in a list of guides it read as one.
 */
export function isGuide(post: { seo: Seo }): boolean {
  return post.seo.canonicalPath !== homeServicePath;
}

/** Posts by their date, newest first: the blog leads with its latest guide.
 *  `date` is the display date ("October 29, 2026"), which `Date` reads. */
export function newestFirst<T extends { date: string }>(posts: T[]): T[] {
  const time = (post: T) => Date.parse(post.date) || 0;
  return [...posts].sort((a, b) => time(b) - time(a));
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

/**
 * Whether a page is meant to rank — the CMS's "show in search results"
 * switch. Everything that advertises a URL to a search engine goes through
 * this: the sitemap, the JSON-LD, and the "other treatments" / "treatments"
 * sidebars. Listing a page in any of them while its own meta tag says
 * `noindex` tells Google two opposite things about the same URL. Flip the
 * switch back and the page reappears in all of them on the next publish.
 *
 * The page itself stays reachable by its URL either way; this is not
 * unpublishing.
 */
export function isIndexable(entry: { seo: Seo }): boolean {
  return !entry.seo.noindex;
}

/**
 * The `robots` override for a page, or nothing when it is plain
 * `index, follow` — in which case the root layout's object (with Yoast's
 * `max-image-preview` / `max-snippet` directives) is inherited untouched.
 *
 * Setting `robots` replaces that whole object rather than merging into it,
 * so an indexable-but-nofollow page has to carry the snippet directives
 * itself or its search result would shrink. A noindex page has no search
 * result, so it carries none, exactly as Yoast does.
 */
function robotsFor(seo: Seo) {
  if (seo.noindex) return { index: false, follow: !seo.nofollow };
  if (seo.nofollow) {
    return {
      index: true,
      follow: false,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    };
  }
  return undefined;
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

    ...(robotsFor(seo) ? { robots: robotsFor(seo) } : {}),
  };
}
