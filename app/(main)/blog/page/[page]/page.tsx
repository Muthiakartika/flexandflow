import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogListing, { POSTS_PER_PAGE } from "@/components/blog/BlogListing";
import PageHero from "@/components/ui/PageHero";
import { listPosts, publishedParams } from "@/lib/cms/read";

export async function generateStaticParams() {
  /* `publishedParams`, not `listPosts` — the latter reads `draftMode()` to
     decide which revision to serve, and Next rejects that outright inside
     `generateStaticParams`, which runs at build time with no HTTP request.
     The count is all this needs anyway. */
  const posts = await publishedParams("POST");
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

  /* Page 1 lives at /blog, so only generate 2..n here. */
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

/**
 * WordPress's actual blog index is at `/blog-2/` — not `/blog/`, which
 * genuinely 404s (a slug collision left WordPress to append "-2"; that
 * detail is exactly why testing `/blog/page/2/` earlier gave the wrong
 * answer and led this comment astray for one revision). Checked directly
 * against `/blog-2/page/2/` on 2026-08-26: same title, same description,
 * and a canonical pointing back at `/blog-2/` — WordPress really does
 * consolidate every paginated page into page 1's `<head>`, and it is not
 * noindexed either. Mirrored exactly, now against the right URL.
 */
export function generateMetadata(): Metadata {
  return {
    title: "Blog - Flex and Flow",
    description:
      "Explore our blog for expert tips on yoga, flexibility training, and Physical Therapy in Uluwatu to support your overall well-being.",
    alternates: { canonical: "/blog/" },
  };
}

export default async function BlogPaginatedPage(
  props: PageProps<"/blog/page/[page]">,
) {
  const { page } = await props.params;
  const current = Number(page);

  const posts = await listPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

  if (!Number.isInteger(current) || current < 2 || current > totalPages) {
    notFound();
  }

  return (
    <>
      <PageHero
        title="Blog"
        eyebrow={`Page ${current}`}
        crumbs={[{ label: "Blog" }]}
      />
      <BlogListing
        posts={posts}
        page={current}
        hrefFor={(target) => (target === 1 ? "/blog" : `/blog/page/${target}`)}
      />
    </>
  );
}
