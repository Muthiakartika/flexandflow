import Link from "next/link";

import { PostRow } from "@/components/content/RelatedBand";
import { BAND_LINE, H2, LINK, WRAP } from "@/components/ui/tokens";
import { listPosts } from "@/lib/cms/read";
import { isIndexable } from "@/lib/content";

/* The three guides that help a reader choose what to book, first; any that
   are missing or kept out of search are filled from the newest posts. */
const featured = ["physiotherapy", "common-surfing-injuries", "yoga"];

/**
 * Three articles from the blog, as the same photo cards the treatment pages
 * end on (`PostRow`). The home page had no way into the blog, which left
 * the guides with a link from nowhere that matters.
 */
export default async function Guides() {
  const posts = (await listPosts()).filter(isIndexable);
  const picked = [
    ...featured.flatMap((slug) => posts.filter((post) => post.slug === slug)),
    ...posts.filter((post) => !featured.includes(post.slug)),
  ].slice(0, 3);
  if (picked.length === 0) return null;

  return (
    <section className={BAND_LINE} aria-labelledby="home-guides">
      <div className={`${WRAP} home-band`}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="page-label">From the blog</p>
            <h2 id="home-guides" className={`mt-2 ${H2}`}>
              Guides From the Studio
            </h2>
            <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[1.7] text-body-text/75">
              Short, practical reads on what to book, and when.
            </p>
          </div>
          <Link href="/blog" className={`${LINK} shrink-0`}>
            All articles &rarr;
          </Link>
        </div>

        <PostRow
          posts={picked.map((post) => ({
            href: post.seo.canonicalPath,
            title: post.title,
            image: post.image,
            label: post.categoryLabel ?? post.category.replace(/-/g, " "),
          }))}
        />
      </div>
    </section>
  );
}
