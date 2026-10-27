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
 * Each listing page is its own canonical, with its own title.
 *
 * This used to mirror WordPress, which gave `/blog-2/page/2/` page 1's title
 * and description and a canonical pointing back at page 1. That tells Google
 * page 2 is a duplicate of page 1, so the posts only listed on page 2 lose
 * their crawl path through the listing — Google's own pagination guidance is
 * a self-referencing canonical per page. Ahrefs flagged the duplicate title.
 */
export async function generateMetadata(
  props: PageProps<"/blog/page/[page]">,
): Promise<Metadata> {
  const { page } = await props.params;
  return {
    title: `Blog - Page ${page} - Flex and Flow`,
    description: `Page ${page} of the Flex and Flow blog: tips on yoga, flexibility training, injury recovery and Physical Therapy in Uluwatu.`,
    alternates: { canonical: `/blog/page/${page}/` },
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
      />
    </>
  );
}
